import { describe, expect, it } from "vitest";
import { createDemoStore } from "../data/demo";
import { deleteRecord, deleteSourceRecords, deletionVersion, editRecord, recordVersion } from "./record-edits";
import { mergePublicRecords, reviewPendingRecord, stageImport, undoPublicMerge } from "./staging";

const time = "2026-11-21T10:00:00.000Z";
describe("admin corrections", () => {
  it("removes source-linked records and merged versions without affecting unrelated records", () => {
    const store = createDemoStore();
    const [a, b, unrelated] = store.records;
    const otherSource = { ...store.sources[0], id: "other", name: "Inne", synthetic: false };
    const other = { ...b, sources: [{ ...b.sources[0], sourceId: otherSource.id }] };
    const untouched = { ...unrelated, sources: [{ ...unrelated.sources[0], sourceId: otherSource.id }] };
    const prepared = { ...store, sources: [...store.sources, otherSource], records: [a, other, untouched] };
    const merged = mergePublicRecords(prepared, other.id, a.id, "Duplikat", time);
    const deleted = deleteSourceRecords(merged, store.sources[0].id, time);
    expect(deleted.store.records.map((record) => record.id)).toEqual([untouched.id]);
    expect(deleted.store.deletedSourceIds).toContain(store.sources[0].id);
    expect(() => undoPublicMerge(deleted.store, merged.mergeHistory[0].id, time)).toThrow("usunął");
    expect(() => stageImport(deleted.store, store.sources[0], [a], [], time)).toThrow("odinstalowane");
  });
  it("withdraws merged versions and allows the same IDs to be reimported and approved", () => {
    const store = createDemoStore();
    const [a, b, unrelated] = store.records;
    const merged = mergePublicRecords(store, a.id, b.id, "Duplikat", time);
    const staged = stageImport(merged, store.sources[0], [b], [], time).store;
    expect(() => deleteRecord(staged, a.id, "published", deletionVersion(merged, a.id), time)).toThrow("zmienił");
    const deleted = deleteRecord(staged, b.id, "pending", deletionVersion(staged, b.id), time);
    expect(deleted.pendingRecords).toEqual([]);
    expect(deleted.records.map((r) => r.id)).toEqual(store.records.slice(2).map((r) => r.id));
    expect(() => undoPublicMerge(deleted, merged.mergeHistory[0].id, time)).toThrow("usunął");
    const repeat = stageImport(deleted, store.sources[0], [a, b, unrelated], [], time);
    expect(repeat.run.importedCount).toBe(3);
    expect(repeat.store.pendingRecords.map((r) => r.id)).toEqual([a.id, b.id, unrelated.id]);
    expect(repeat.store.records.some((r) => r.id === a.id)).toBe(false);
    expect(() => undoPublicMerge(repeat.store, merged.mergeHistory[0].id, time)).toThrow("usunął");
    const approvedA = reviewPendingRecord(repeat.store, a.id, "approved", "", time);
    const approvedB = reviewPendingRecord(approvedA, b.id, "approved", "", time);
    const mergedAgain = mergePublicRecords(approvedB, a.id, b.id, "Ponownie potwierdzony duplikat", time);
    const undone = undoPublicMerge(mergedAgain, mergedAgain.mergeHistory[0].id, time);
    expect(undone.records.filter((r) => r.id === a.id || r.id === b.id)).toHaveLength(2);
  });
  it("preserves corrections across imports and leaves fresh source fields available", () => {
    const store = createDemoStore();
    const original = store.records[0];
    const next = editRecord(store, original.id, "published", recordVersion(original), { name: "AED przy windzie" }, time);
    const incoming = { ...original, operatorName: "Nowy operator" };
    const staged = stageImport(next, store.sources[0], [incoming], [], time).store;
    expect(staged.pendingRecords[0]).toMatchObject({ name: "AED przy windzie", operatorName: "Nowy operator", sources: original.sources });
    const pending = staged.pendingRecords[0];
    const draft = editRecord(staged, pending.id, "pending", recordVersion(pending), { name: "Projekt korekty" }, time);
    expect(draft.records[0].name).toBe("AED przy windzie");
    const published = editRecord(draft, original.id, "published", recordVersion(draft.records[0]), { name: "Korekta katalogu", address: "Plac 1" }, time);
    expect(published.pendingRecords[0]).toMatchObject({ name: "Projekt korekty", address: "Plac 1" });
    expect(() => editRecord(next, original.id, "published", recordVersion(original), { name: "Stara karta" }, time)).toThrow("zmienił");
  });
});
