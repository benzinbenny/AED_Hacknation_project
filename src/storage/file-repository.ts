import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { AedRecordSchema, type ImportIssue, type SourceDescriptor } from "../domain/types";
import type { AedStore, ImportRun, MergeHistoryEvent, ModerationDecision, StoredSource } from "../services/staging";

const SourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string(),
  upstreamOrigin: z.string(),
  licenseId: z.string(),
  attribution: z.string(),
  referenceScope: z.object({
    geographyLabel: z.string(),
    geographyLevel: z.enum(["country", "voivodeship", "county", "municipality", "locality", "custom", "unknown"]),
    temporalDescription: z.string(),
    sourceDataDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    updateFrequency: z.string(),
    basis: z.enum(["publisher_declared", "observed_export", "unverified"]),
    limitations: z.string(),
  }).optional(),
  licenseReviewStatus: z.enum(["approved", "needs_review", "blocked"]),
  synthetic: z.boolean(),
  datasetId: z.string().regex(/^\d+$/).optional(),
});
const IssueSchema: z.ZodType<ImportIssue> = z.object({
  code: z.enum(["invalid_coordinates", "outside_poland", "missing_source_record_id", "unsupported_geometry", "invalid_feature"]),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
  sourceRecordId: z.string().nullable(),
});
const ImportRunSchema: z.ZodType<ImportRun> = z.object({
  id: z.string().uuid(),
  sourceId: z.string(),
  fetchedAt: z.string().datetime({ offset: true }),
  importedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  issues: z.array(IssueSchema),
});
const DecisionSchema: z.ZodType<ModerationDecision> = z.object({
  recordId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  decidedAt: z.string().datetime({ offset: true }),
  reason: z.string(),
});
const MergeEventSchema: z.ZodType<MergeHistoryEvent> = z.object({
  id: z.string().uuid(),
  survivingRecordId: z.string().uuid(),
  mergedRecordId: z.string().uuid(),
  decidedAt: z.string().datetime({ offset: true }),
  reason: z.string(),
  status: z.enum(["merged", "reverted"]),
  survivorBefore: AedRecordSchema,
  mergedSnapshot: AedRecordSchema,
  undoneAt: z.string().datetime({ offset: true }).nullable(),
  invalidatedAt: z.string().datetime({ offset: true }).optional(),
});
const StoreSchema: z.ZodType<AedStore> = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(SourceSchema),
  records: z.array(AedRecordSchema),
  pendingRecords: z.array(AedRecordSchema),
  importRuns: z.array(ImportRunSchema),
  decisions: z.array(DecisionSchema),
  mergeHistory: z.array(MergeEventSchema).default([]),
  deletedRecords: z.record(z.string().uuid(), z.string().datetime({ offset: true })).optional(),
  uninstalledSourceIds: z.array(z.string().min(1)).optional(),
  deletedSourceIds: z.array(z.string().min(1)).optional(),
  forgottenSourceIds: z.array(z.string().min(1)).optional(),
});

export interface AedRepository {
  load(): Promise<AedStore>;
  update<T>(mutate: (current: AedStore) => { store: AedStore; result?: T } | AedStore): Promise<T | AedStore>;
  replace(store: AedStore): Promise<void>;
}

/** A single-process JSON repository for the local demonstration. */
export class JsonFileRepository implements AedRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly createInitialState: () => AedStore,
  ) {}

  async load(): Promise<AedStore> {
    let content: string;
    try {
      content = await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return this.createInitialState();
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Store file is not valid JSON: ${this.filePath}`);
    }
    const result = StoreSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Store file does not match schema v1: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
    }
    // Retire legacy import blocks while preserving deletion of old merge snapshots.
    const store = result.data;
    if (!store.deletedRecords) return store;
    const deletedRecords = store.deletedRecords;
    return {
      ...store,
      deletedRecords: undefined,
      mergeHistory: store.mergeHistory.map((event) => {
        const deletedAt = deletedRecords[event.survivingRecordId] ?? deletedRecords[event.mergedRecordId];
        return deletedAt && event.status === "merged" ? { ...event, invalidatedAt: event.invalidatedAt ?? deletedAt } : event;
      }),
    };
  }

  async update<T>(mutate: (current: AedStore) => { store: AedStore; result?: T } | AedStore): Promise<T | AedStore> {
    return this.enqueue(async () => {
      const current = await this.load();
      const mutation = mutate(current);
      const hasResult = "store" in mutation;
      const next = StoreSchema.parse(hasResult ? mutation.store : mutation);
      await this.writeAtomically(next);
      return hasResult ? (mutation.result as T) : next;
    });
  }

  async replace(store: AedStore): Promise<void> {
    await this.enqueue(async () => {
      const validated = StoreSchema.parse(store);
      await this.writeAtomically(validated);
    });
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(work);
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async writeAtomically(store: AedStore): Promise<void> {
    const directory = path.dirname(this.filePath);
    await mkdir(directory, { recursive: true });
    const temporaryPath = path.join(directory, `.${path.basename(this.filePath)}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporaryPath, JSON.stringify(store), { encoding: "utf8", flag: "wx" });
      for (let attempt = 0; ; attempt += 1) {
        try {
          await rename(temporaryPath, this.filePath);
          break;
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (process.platform !== "win32" || !["EPERM", "EBUSY"].includes(code ?? "") || attempt >= 4) throw error;
          await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        }
      }
    } catch (error) {
      const { unlink } = await import("node:fs/promises");
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }
}

export type { SourceDescriptor, StoredSource };
