import type { AedRecord } from "../domain/types";
import type { AedStore } from "./staging";

export function isRecordExportable(record: AedRecord, store: AedStore): boolean {
  if (record.sources.length === 0) return false;
  const byId = new Map(store.sources.map((source) => [source.id, source]));
  return record.sources.every((reference) => {
    const source = byId.get(reference.sourceId);
    return Boolean(source && source.licenseReviewStatus === "approved" && !source.synthetic && reference.licenseId && reference.licenseId !== "unknown");
  });
}

export function exportableRecords(store: AedStore): AedRecord[] {
  return store.records.filter((record) => isRecordExportable(record, store));
}
