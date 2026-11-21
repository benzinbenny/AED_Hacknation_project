import type { AedRecord } from "../domain/types";
import type { AedStore } from "../services/staging";

const demoSourceId = "synthetic-demo";
const fetchedAt = "2026-11-21T10:00:00.000Z";

function demoRecord(
  id: string,
  sourceRecordId: string,
  latitude: number,
  longitude: number,
  name: string,
  address: string,
  accessType: AedRecord["accessType"],
  operationalStatus: AedRecord["operationalStatus"],
  rawHours: string | null,
): AedRecord {
  return {
    id,
    name,
    operatorName: "Organizator demonstracji",
    location: { latitude, longitude },
    address,
    locationDescription: "Pozycja i opis są fikcyjne — przykład interfejsu, nie wskazówka dojazdu.",
    accessType,
    accessNotes: null,
    availability: { rawHours, state: "unknown", evaluatedAt: null },
    operationalStatus,
    lastVerifiedAt: null,
    verificationMethod: null,
    recordStatus: "active",
    sources: [{
      sourceId: demoSourceId,
      sourceRecordId,
      fetchedAt,
      sourceUpdatedAt: null,
      sourceUrl: "https://example.invalid/dane-syntetyczne",
      upstreamOrigin: "local-demo",
      licenseId: "CC0-1.0",
      attribution: "Dane całkowicie syntetyczne; wygenerowane na potrzeby demonstracji.",
      rawRecordHash: null,
    }],
  };
}

export function createDemoStore(): AedStore {
  return {
    schemaVersion: 1,
    sources: [{
      id: demoSourceId,
      name: "Zbiór syntetyczny — demonstracja",
      url: "https://example.invalid/dane-syntetyczne",
      upstreamOrigin: "local-demo",
      licenseId: "CC0-1.0",
      attribution: "Dane całkowicie syntetyczne; wygenerowane na potrzeby demonstracji.",
      licenseReviewStatus: "approved",
      synthetic: true,
    }],
    records: [
      demoRecord("88a770a6-ea72-5baf-a1e0-ff1000000001", "demo-01", 52.2301, 21.0103, "AED demonstracyjny 01", "Przykładowy budynek A", "public", "unknown", "24/7 (przykład)"),
      demoRecord("88a770a6-ea72-5baf-a1e0-ff1000000002", "demo-02", 52.2302, 21.0104, "AED demonstracyjny 02", "Przykładowy budynek A", "customers", "unknown", "pon.–pt. 08:00–18:00 (przykład)"),
      demoRecord("88a770a6-ea72-5baf-a1e0-ff1000000003", "demo-03", 52.2351, 21.0181, "AED demonstracyjny 03", "Przykładowy budynek B", "unknown", "reported_out_of_service", null),
      demoRecord("88a770a6-ea72-5baf-a1e0-ff1000000004", "demo-04", 52.2255, 21.0042, "AED demonstracyjny 04", "Przykładowy budynek C", "public", "reported_operational", "codziennie 07:00–22:00 (przykład)"),
    ],
    pendingRecords: [],
    importRuns: [],
    decisions: [],
    mergeHistory: [],
  };
}
