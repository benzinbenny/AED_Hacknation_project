import { randomUUID } from "node:crypto";
import type { AedRecord, ImportIssue, SourceDescriptor } from "../domain/types";

export type LicenseReviewStatus = "approved" | "needs_review" | "blocked";

export type StoredSource = SourceDescriptor & {
  licenseReviewStatus: LicenseReviewStatus;
  synthetic: boolean;
};

export type ImportRun = {
  id: string;
  sourceId: string;
  fetchedAt: string;
  importedCount: number;
  rejectedCount: number;
  warningCount: number;
  issues: ImportIssue[];
};

export type ModerationDecision = {
  recordId: string;
  decision: "approved" | "rejected";
  decidedAt: string;
  reason: string;
};

export type MergeHistoryEvent = {
  id: string;
  survivingRecordId: string;
  mergedRecordId: string;
  decidedAt: string;
  reason: string;
  status: "merged" | "reverted";
  survivorBefore: AedRecord;
  mergedSnapshot: AedRecord;
  undoneAt: string | null;
};

export type AedStore = {
  schemaVersion: 1;
  sources: StoredSource[];
  records: AedRecord[];
  pendingRecords: AedRecord[];
  importRuns: ImportRun[];
  decisions: ModerationDecision[];
  mergeHistory: MergeHistoryEvent[];
};

export function createEmptyStore(): AedStore {
  return { schemaVersion: 1, sources: [], records: [], pendingRecords: [], importRuns: [], decisions: [], mergeHistory: [] };
}

export function stageImport(
  store: AedStore,
  source: SourceDescriptor,
  records: AedRecord[],
  issues: ImportIssue[],
  fetchedAt: string,
): { store: AedStore; run: ImportRun } {
  const knownSource = store.sources.find((candidate) => candidate.id === source.id);
  const storedSource: StoredSource = knownSource
    ? { ...knownSource, ...source }
    : { ...source, licenseReviewStatus: "needs_review", synthetic: false };

  const pendingById = new Map(store.pendingRecords.map((record) => [record.id, record]));
  for (const record of records) pendingById.set(record.id, record);

  const run: ImportRun = {
    id: randomUUID(),
    sourceId: source.id,
    fetchedAt,
    importedCount: records.length,
    rejectedCount: issues.filter((issue) => issue.severity === "error").length,
    warningCount: issues.filter((issue) => issue.severity === "warning").length,
    issues,
  };

  return {
    store: {
      ...store,
      sources: knownSource ? store.sources.map((candidate) => candidate.id === source.id ? storedSource : candidate) : [...store.sources, storedSource],
      pendingRecords: [...pendingById.values()],
      importRuns: [run, ...store.importRuns],
    },
    run,
  };
}

export function reviewPendingRecord(
  store: AedStore,
  recordId: string,
  decision: ModerationDecision["decision"],
  reason: string,
  decidedAt: string,
): AedStore {
  const pendingRecord = store.pendingRecords.find((record) => record.id === recordId);
  if (!pendingRecord) throw new Error(`Pending AED record not found: ${recordId}`);
  if (decision === "approved") {
    const sources = new Map(store.sources.map((source) => [source.id, source]));
    const hasUnreviewedSource = pendingRecord.sources.some((reference) => {
      const source = sources.get(reference.sourceId);
      return !source || source.licenseReviewStatus !== "approved" || !reference.licenseId || reference.licenseId === "unknown";
    });
    if (hasUnreviewedSource) throw new Error("Source license must be approved before publishing this AED.");
  }

  const records = decision === "approved"
    ? [...store.records.filter((record) => record.id !== recordId), pendingRecord]
    : store.records;

  return {
    ...store,
    records,
    pendingRecords: store.pendingRecords.filter((record) => record.id !== recordId),
    decisions: [{ recordId, decision, decidedAt, reason: reason.trim() }, ...store.decisions],
  };
}

export function mergePublicRecords(
  store: AedStore,
  survivingRecordId: string,
  mergedRecordId: string,
  reason: string,
  decidedAt: string,
): AedStore {
  if (survivingRecordId === mergedRecordId) throw new Error("Choose two different AED records.");
  const survivor = store.records.find((record) => record.id === survivingRecordId);
  const merged = store.records.find((record) => record.id === mergedRecordId);
  if (!survivor || !merged) throw new Error("Both records must be approved and publicly available before merging.");
  const activeMerge = store.mergeHistory.some((event) => event.status === "merged" && (event.survivingRecordId === mergedRecordId || event.mergedRecordId === mergedRecordId));
  if (activeMerge) throw new Error("This record is already part of an active merge.");

  const sourceMap = new Map<string, AedRecord["sources"][number]>();
  for (const source of [...survivor.sources, ...merged.sources]) {
    sourceMap.set(`${source.sourceId}\0${source.sourceRecordId}`, source);
  }
  const consolidated: AedRecord = {
    ...survivor,
    name: survivor.name ?? merged.name,
    operatorName: survivor.operatorName ?? merged.operatorName,
    address: survivor.address ?? merged.address,
    locationDescription: survivor.locationDescription ?? merged.locationDescription,
    accessNotes: survivor.accessNotes ?? merged.accessNotes,
    availability: survivor.availability.rawHours ? survivor.availability : merged.availability,
    lastVerifiedAt: survivor.lastVerifiedAt ?? merged.lastVerifiedAt,
    verificationMethod: survivor.verificationMethod ?? merged.verificationMethod,
    sources: [...sourceMap.values()],
  };
  const event: MergeHistoryEvent = {
    id: randomUUID(),
    survivingRecordId,
    mergedRecordId,
    decidedAt,
    reason: reason.trim(),
    status: "merged",
    survivorBefore: survivor,
    mergedSnapshot: merged,
    undoneAt: null,
  };
  return {
    ...store,
    records: [...store.records.filter((record) => record.id !== survivingRecordId && record.id !== mergedRecordId), consolidated],
    mergeHistory: [event, ...store.mergeHistory],
  };
}

export function undoPublicMerge(store: AedStore, mergeId: string, undoneAt: string): AedStore {
  const event = store.mergeHistory.find((item) => item.id === mergeId);
  if (!event || event.status !== "merged") throw new Error("Active merge was not found.");
  const hasLaterMerge = store.mergeHistory.some((item) => item.status === "merged" && item.id !== mergeId && item.decidedAt > event.decidedAt && item.survivingRecordId === event.survivingRecordId);
  if (hasLaterMerge) throw new Error("Undo later merges first.");
  return {
    ...store,
    records: [...store.records.filter((record) => record.id !== event.survivingRecordId), event.survivorBefore, event.mergedSnapshot],
    mergeHistory: store.mergeHistory.map((item) => item.id === mergeId ? { ...item, status: "reverted", undoneAt } : item),
  };
}
