import type { AedRecord } from "../domain/types";
import type { AedStore, StoredSource } from "./staging";

function sourceIndex(store: AedStore) {
  return new Map(store.sources.map((source) => [source.id, source]));
}

function canExport(record: AedRecord, byId: Map<string, StoredSource>): boolean {
  if (record.sources.length === 0) return false;
  return record.sources.every((reference) => {
    const source = byId.get(reference.sourceId);
    return Boolean(source && source.licenseReviewStatus === "approved" && !source.synthetic && reference.licenseId && reference.licenseId !== "unknown");
  });
}

export function isRecordExportable(record: AedRecord, store: AedStore): boolean {
  return canExport(record, sourceIndex(store));
}

export function exportableRecords(store: AedStore): AedRecord[] {
  const byId = sourceIndex(store);
  return store.records.filter((record) => canExport(record, byId));
}

function canDisplay(record: AedRecord, byId: Map<string, StoredSource>): boolean {
  if (record.recordStatus === "removed" || record.recordStatus === "temporarily_removed" || record.sources.length === 0) return false;
  return record.sources.every((reference) => {
    const source = byId.get(reference.sourceId);
    if (!source) return false;
    if (source.synthetic) return true;
    return source.licenseReviewStatus === "approved" && Boolean(reference.licenseId && reference.licenseId !== "unknown");
  });
}

export function isRecordPublic(record: AedRecord, store: AedStore): boolean {
  return canDisplay(record, sourceIndex(store));
}

export function publicRecords(store: AedStore): AedRecord[] {
  const byId = sourceIndex(store);
  const demo: AedRecord[] = [];
  const moderated: AedRecord[] = [];
  for (const record of store.records) {
    if (!canDisplay(record, byId)) continue;
    const synthetic = record.sources.every((ref) => byId.get(ref.sourceId)?.synthetic);
    (synthetic ? demo : moderated).push(record);
  }
  return moderated.length ? moderated : demo;
}
