import { describe, expect, it } from "vitest";
import type { AedRecord } from "../domain/types";
import type { AedStore, StoredSource } from "./staging";
import { publicRecords } from "./licensing";

const source: StoredSource = {
  id: "municipal-source",
  name: "Miasto testowe",
  url: "https://example.invalid/aed",
  upstreamOrigin: "Miasto testowe",
  licenseId: "CC BY 4.0",
  attribution: "Miasto testowe",
  licenseReviewStatus: "approved",
  synthetic: false,
};

const record: AedRecord = {
  id: "44444444-4444-5444-8444-444444444444",
  name: "AED opublikowany po moderacji",
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
  recordStatus: "unknown",
  sources: [{ sourceId: source.id, sourceRecordId: "row-1", fetchedAt: "2026-11-21T10:00:00.000Z", licenseId: "CC BY 4.0" }],
};

function storeWith(records: AedRecord[], sources: StoredSource[]): AedStore {
  return { schemaVersion: 1, records, sources, pendingRecords: [], importRuns: [], decisions: [], mergeHistory: [] };
}

describe("publicRecords", () => {
  it("shows moderated real records with an unknown record status, but hides removed and unlicensed records", () => {
    expect(publicRecords(storeWith([record], [source]))).toEqual([record]);
    expect(publicRecords(storeWith([{ ...record, recordStatus: "removed" }], [source]))).toEqual([]);
    expect(publicRecords(storeWith([record], [{ ...source, licenseReviewStatus: "blocked" }]))).toEqual([]);
  });

  it("uses demo data only as a fallback once moderated source records are available", () => {
    const demoSource: StoredSource = { ...source, id: "demo", synthetic: true, licenseReviewStatus: "approved" };
    const demoRecord: AedRecord = {
      ...record,
      id: "55555555-5555-5555-8555-555555555555",
      sources: [{ sourceId: demoSource.id, sourceRecordId: "demo-1", fetchedAt: "2026-11-21T10:00:00.000Z", licenseId: "CC0-1.0" }],
    };

    expect(publicRecords(storeWith([record, demoRecord], [source, demoSource]))).toEqual([record]);
    expect(publicRecords(storeWith([demoRecord], [demoSource]))).toEqual([demoRecord]);
  });
});
