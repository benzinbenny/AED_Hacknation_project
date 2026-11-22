import { createHash } from "node:crypto";
import type { AedRecord, EditStage, RecordChanges } from "../domain/types";
import type { AedStore } from "./staging";

export function recordVersion(record: AedRecord): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex");
}

export function applyLocalCorrection(record: AedRecord, correction: AedRecord["localCorrection"]): AedRecord {
  if (!correction) return record;
  const changes = correction.changes;
  const updated = { ...record, ...changes, localCorrection: correction };
  if (changes.location || changes.accessType || changes.operationalStatus || "accessNotes" in changes || "locationDescription" in changes || "address" in changes) {
    updated.lastVerifiedAt = null;
    updated.verificationMethod = null;
    updated.verificationScope = "unknown";
    updated.verificationActorType = "unknown";
    updated.nextVerificationDueAt = null;
  }
  if (changes.location) updated.coordinateAccuracyMeters = null;
  if (changes.operationalStatus) updated.operationalStatusObservedAt = null;
  return updated;
}

export class EditConflict extends Error {
  constructor(readonly status: 404 | 409, message: string) { super(message); }
}

function deletionIds(store: AedStore, initialIds: Iterable<string>) {
  const neighbors = new Map<string, string[]>();
  function connect(from: string, to: string) {
    const list = neighbors.get(from);
    if (list) list.push(to);
    else neighbors.set(from, [to]);
  }
  for (const event of store.mergeHistory) {
    if (event.status !== "merged" || event.invalidatedAt) continue;
    connect(event.survivingRecordId, event.mergedRecordId);
    connect(event.mergedRecordId, event.survivingRecordId);
  }
  const ids = new Set(initialIds);
  for (const member of ids) {
    for (const related of neighbors.get(member) ?? []) ids.add(related);
  }
  return ids;
}

export function deletionVersion(store: AedStore, id: string) {
  const ids = deletionIds(store, [id]);
  const versions = [store.records, store.pendingRecords].map((records) =>
    records.filter((record) => ids.has(record.id)).map(recordVersion).sort());
  return createHash("sha256").update(JSON.stringify([Array.from(ids).sort(), versions])).digest("hex");
}

export function deleteRecord(store: AedStore, id: string, stage: EditStage, version: string, deletedAt: string): AedStore {
  const records = stage === "published" ? store.records : store.pendingRecords;
  if (!records.some((record) => record.id === id)) throw new EditConflict(404, "Wpis został już usunięty lub przeniesiony.");
  if (deletionVersion(store, id) !== version) throw new EditConflict(409, "Wpis zmienił się. Otwórz aktualną wersję przed usunięciem.");
  const ids = deletionIds(store, [id]);
  return {
    ...store,
    mergeHistory: store.mergeHistory.map((event) => event.status === "merged" && !event.invalidatedAt && (ids.has(event.survivingRecordId) || ids.has(event.mergedRecordId))
      ? { ...event, invalidatedAt: deletedAt } : event),
    records: store.records.filter((record) => !ids.has(record.id)),
    pendingRecords: store.pendingRecords.filter((record) => !ids.has(record.id)),
  };
}

export function deleteSourceRecords(store: AedStore, sourceId: string, deletedAt: string): { store: AedStore; removedCount: number } {
  const allRecords = [...store.records, ...store.pendingRecords];
  const initialIds = allRecords.filter((record) => record.sources.some((source) => source.sourceId === sourceId)).map((record) => record.id);
  const ids = deletionIds(store, initialIds);
  const removedCount = allRecords.filter((record) => ids.has(record.id)).length;
  return {
    removedCount,
    store: {
      ...store,
      deletedSourceIds: [...new Set([...(store.deletedSourceIds ?? []), sourceId])],
      uninstalledSourceIds: (store.uninstalledSourceIds ?? []).filter((id) => id !== sourceId),
      sources: store.sources.map((source) => source.id === sourceId && !source.synthetic ? { ...source, licenseReviewStatus: "needs_review" } : source),
      records: store.records.filter((record) => !ids.has(record.id)),
      pendingRecords: store.pendingRecords.filter((record) => !ids.has(record.id)),
      mergeHistory: store.mergeHistory.map((event) => event.status === "merged" && !event.invalidatedAt && (ids.has(event.survivingRecordId) || ids.has(event.mergedRecordId)) ? { ...event, invalidatedAt: deletedAt } : event),
    },
  };
}

export function editRecord(store: AedStore, id: string, stage: EditStage, version: string, changes: RecordChanges, updatedAt: string): AedStore {
  const key = stage === "pending" ? "pendingRecords" : "records";
  const current = store[key].find((record) => record.id === id);
  if (!current) throw new EditConflict(404, "Wpis nie jest już dostępny w wybranym zbiorze.");
  if (recordVersion(current) !== version) throw new EditConflict(409, "Wpis zmienił się podczas edycji. Otwórz aktualną wersję i ponów zmianę.");
  const correction = { updatedAt, changes: { ...current.localCorrection?.changes, ...changes } };
  const edited = applyLocalCorrection(current, correction);
  const result = { ...store, [key]: store[key].map((record) => record.id === id ? edited : record) };
  if (stage === "published") {
    result.pendingRecords = result.pendingRecords.map((pending) => {
      if (pending.id !== id) return pending;
      const pendingOverrides = { ...pending.localCorrection?.changes };
      // Keep an independently edited draft when the same field exists in both versions.
      for (const field of Object.keys(changes) as (keyof RecordChanges)[]) {
        if (JSON.stringify(pendingOverrides[field]) === JSON.stringify(current.localCorrection?.changes[field])) delete pendingOverrides[field];
      }
      return applyLocalCorrection(pending, { updatedAt, changes: { ...correction.changes, ...pendingOverrides } });
    });
  }
  return result;
}
