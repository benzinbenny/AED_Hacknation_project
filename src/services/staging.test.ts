import { describe, expect, it } from "vitest";
import type { AedRecord, SourceDescriptor } from "../domain/types";
import { createEmptyStore, mergePublicRecords, reviewPendingRecord, stageImport, undoPublicMerge } from "./staging";

const source: SourceDescriptor = {
  id: "municipal-csv",
  name: "Plik dysponenta",
  url: "https://example.invalid/aed.csv",
  upstreamOrigin: "Dysponent testowy",
  licenseId: "CC0-1.0",
  attribution: "Dane demonstracyjne",
};

const record: AedRecord = {
  id: "11111111-1111-5111-8111-111111111111",
  name: "AED przy wejściu",
  operatorName: null,
  location: { latitude: 52.23, longitude: 21.01 },
  address: null,
  locationDescription: null,
  accessType: "unknown",
  accessNotes: null,
  availability: { rawHours: null, state: "unknown", evaluatedAt: null },
  operationalStatus: "unknown",
  lastVerifiedAt: null,
  verificationMethod: null,
  recordStatus: "active",
  sources: [{ sourceId: source.id, sourceRecordId: "row-1", fetchedAt: "2026-11-21T10:00:00.000Z", licenseId: "CC0-1.0" }],
};

describe("staging and moderation", () => {
  it("makes repeated imports idempotent for a source record", () => {
    const initial = createEmptyStore();
    const first = stageImport(initial, source, [record], [], "2026-11-21T10:00:00.000Z");
    const changed = { ...record, name: "AED przy drzwiach" };
    const second = stageImport(first.store, source, [changed], [], "2026-11-22T10:00:00.000Z");

    expect(second.store.pendingRecords).toHaveLength(1);
    expect(second.store.pendingRecords[0].name).toBe("AED przy drzwiach");
    expect(second.store.importRuns).toHaveLength(2);
  });

  it("moves an approved record into the public set and records the decision", () => {
    const staged = stageImport(createEmptyStore(), source, [record], [], "2026-11-21T10:00:00.000Z");
    const licensed = { ...staged.store, sources: staged.store.sources.map((item) => ({ ...item, licenseReviewStatus: "approved" as const })) };

    const reviewed = reviewPendingRecord(licensed, record.id, "approved", "Źródło sprawdzone", "2026-11-21T11:00:00.000Z");

    expect(reviewed.records).toHaveLength(1);
    expect(reviewed.pendingRecords).toHaveLength(0);
    expect(reviewed.decisions[0]).toMatchObject({ recordId: record.id, decision: "approved", reason: "Źródło sprawdzone" });
  });

  it("blocks publication while a source license is unresolved", () => {
    const staged = stageImport(createEmptyStore(), source, [record], [], "2026-11-21T10:00:00.000Z");

    expect(() => reviewPendingRecord(staged.store, record.id, "approved", "", "2026-11-21T11:00:00.000Z"))
      .toThrow("Source license must be approved");
  });

  it("requires another license review when an existing source changes license or provenance", () => {
    const staged = stageImport(createEmptyStore(), source, [record], [], "2026-11-21T10:00:00.000Z");
    const approved = { ...staged.store, sources: staged.store.sources.map((item) => ({ ...item, licenseReviewStatus: "approved" as const })) };
    const changedRecord = { ...record, id: "33333333-3333-5333-8333-333333333333", sources: [{ ...record.sources[0], sourceRecordId: "row-2", licenseId: "CC-BY-4.0" }] };

    const reimported = stageImport(approved, { ...source, licenseId: "CC-BY-4.0" }, [changedRecord], [], "2026-11-22T10:00:00.000Z");

    expect(reimported.store.sources[0].licenseReviewStatus).toBe("needs_review");
    expect(() => reviewPendingRecord(reimported.store, changedRecord.id, "approved", "", "2026-11-22T11:00:00.000Z"))
      .toThrow("Source license must be approved");
  });

  it("does not unblock a source that a moderator previously blocked", () => {
    const staged = stageImport(createEmptyStore(), source, [record], [], "2026-11-21T10:00:00.000Z");
    const blocked = { ...staged.store, sources: staged.store.sources.map((item) => ({ ...item, licenseReviewStatus: "blocked" as const })) };

    const reimported = stageImport(blocked, { ...source, licenseId: "CC-BY-4.0" }, [record], [], "2026-11-22T10:00:00.000Z");

    expect(reimported.store.sources[0].licenseReviewStatus).toBe("blocked");
  });

  it.each(["2026-11-21T10:30:00Z", "2026-11-21T10:00:00Z"])("requires dependent merges to be undone newest first at %s", (nextTime) => {
    const records = [record, { ...record, id: "second" }, { ...record, id: "third" }];
    const first = mergePublicRecords({ ...createEmptyStore(), records }, record.id, "second", "A", "2026-11-21T12:00:00+02:00");
    const next = mergePublicRecords(first, record.id, "third", "B", nextTime);
    const undoneAt = "2026-11-21T13:00:00Z";
    expect(() => undoPublicMerge(next, first.mergeHistory[0].id, undoneAt)).toThrow("Undo later merges first");
    const latestUndone = undoPublicMerge(next, next.mergeHistory[0].id, undoneAt);
    expect(undoPublicMerge(latestUndone, first.mergeHistory[0].id, undoneAt).records).toHaveLength(3);
  });

  it("refuses to restore a missing survivor", () => {
    const records = [record, { ...record, id: "second" }];
    const first = mergePublicRecords({ ...createEmptyStore(), records }, record.id, "second", "A", "2026-11-21T10:00:00Z");
    expect(() => undoPublicMerge({ ...first, records: [] }, first.mergeHistory[0].id, "2026-11-21T11:00:00Z"))
      .toThrow("późniejszym scaleniu");
  });

  it("merges only on request and can restore both records from history", () => {
    const other = { ...record, id: "22222222-2222-5222-8222-222222222222", sources: [{ ...record.sources[0], sourceRecordId: "row-2" }] };
    const approved = {
      ...createEmptyStore(),
      sources: [{ ...source, licenseReviewStatus: "approved" as const, synthetic: false }],
      records: [record, other],
    };

    const merged = mergePublicRecords(approved, record.id, other.id, "Potwierdzone u dysponenta", "2026-11-21T12:00:00.000Z");
    expect(merged.records).toHaveLength(1);
    expect(merged.records[0].sources).toHaveLength(2);
    expect(merged.mergeHistory[0].status).toBe("merged");

    const undone = undoPublicMerge(merged, merged.mergeHistory[0].id, "2026-11-21T12:30:00.000Z");
    expect(undone.records.map((item) => item.id).sort()).toEqual([record.id, other.id].sort());
    expect(undone.mergeHistory[0]).toMatchObject({ status: "reverted", undoneAt: "2026-11-21T12:30:00.000Z" });
  });
});
