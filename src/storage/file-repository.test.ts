import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyStore } from "../services/staging";
import { JsonFileRepository } from "./file-repository";
import { createDemoStore } from "../data/demo";
import { mergePublicRecords, stageImport, undoPublicMerge } from "../services/staging";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "aed-store-test-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("JsonFileRepository", () => {
  it("retires saved legacy deletion blocks and keeps old merge snapshots invalidated", async () => {
    const store = createDemoStore();
    const [a, b] = store.records;
    const time = "2026-11-21T12:00:00Z";
    const merged = mergePublicRecords(store, a.id, b.id, "Duplikat", time);
    const repository = new JsonFileRepository(path.join(directory, "legacy.json"), createEmptyStore);
    await repository.replace({ ...merged, records: [], deletedRecords: { [a.id]: time, [b.id]: time } });
    const loaded = await repository.load();
    expect(loaded.deletedRecords).toBeUndefined();
    const imported = stageImport(loaded, store.sources[0], [a, b], [], time);
    expect(imported.run.importedCount).toBe(2);
    expect(imported.store.pendingRecords).toHaveLength(2);
    expect(imported.store.mergeHistory[0].invalidatedAt).toBe(time);
    expect(() => undoPublicMerge(imported.store, merged.mergeHistory[0].id, time)).toThrow("usunął");
    await repository.replace(imported.store);
    expect((await repository.load()).pendingRecords).toHaveLength(2);
  });
  it("starts from a valid empty store when there is no saved file", async () => {
    const repository = new JsonFileRepository(path.join(directory, "store.json"), createEmptyStore);

    const store = await repository.load();

    expect(store.schemaVersion).toBe(1);
    expect(store.records).toEqual([]);
  });

  it("persists validated state atomically and reloads it", async () => {
    const filePath = path.join(directory, "store.json");
    const repository = new JsonFileRepository(filePath, createEmptyStore);

    await repository.update((store) => ({ ...store, sources: [{
      id: "demo",
      name: "Dane syntetyczne",
      url: "https://example.invalid/demo",
      upstreamOrigin: "demo",
      licenseId: "CC0-1.0",
      attribution: "Dane syntetyczne",
      referenceScope: {
        geographyLabel: "Powiat przykładowy",
        geographyLevel: "county",
        temporalDescription: "Dane na dzień 2026-01-01",
        sourceDataDate: "2026-01-01",
        updateFrequency: "Rocznie",
        basis: "publisher_declared",
        limitations: "Zakres deklarowany przez wydawcę.",
      },
      licenseReviewStatus: "approved",
      synthetic: true,
    }] }));
    const reloaded = await new JsonFileRepository(filePath, createEmptyStore).load();

    expect(reloaded.sources[0]).toMatchObject({
      id: "demo",
      synthetic: true,
      licenseReviewStatus: "approved",
      referenceScope: { geographyLabel: "Powiat przykładowy", geographyLevel: "county", sourceDataDate: "2026-01-01" },
    });
  });
});
