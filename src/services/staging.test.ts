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
