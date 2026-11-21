import { describe, expect, it } from "vitest";
import { findDuplicateCandidates } from "./duplicates";
import type { AedRecord } from "./types";

const record = (id: string, sourceRecordId: string, longitude: number): AedRecord => ({
  id,
  name: "AED w budynku",
  operatorName: null,
  location: { latitude: 52.23, longitude },
  address: null,
  locationDescription: "Hol główny",
  accessType: "unknown",
  accessNotes: null,
  availability: { rawHours: null, state: "unknown", evaluatedAt: null },
  operationalStatus: "unknown",
  lastVerifiedAt: null,
  verificationMethod: null,
  recordStatus: "active",
  sources: [{ sourceId: "source-a", sourceRecordId, fetchedAt: "2026-11-21T10:00:00.000Z" }],
});

describe("findDuplicateCandidates", () => {
  it("suggests nearby records for human review without merging them", () => {
    const records = [record("aed-1", "row-1", 21.01), record("aed-2", "row-2", 21.0101)];

    const candidates = findDuplicateCandidates(records, 25);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ recordIds: ["aed-1", "aed-2"], decisionRequired: true });
    expect(records).toHaveLength(2);
  });

  it("does not treat a shared upstream origin as independent confirmation", () => {
    const records = [
      { ...record("aed-1", "node/1", 21.01), sources: [{ sourceId: "osm", sourceRecordId: "node/1", fetchedAt: "2026-11-21T10:00:00.000Z", upstreamOrigin: "OpenStreetMap" }] },
      { ...record("aed-2", "node/1", 21.01001), sources: [{ sourceId: "geoportal", sourceRecordId: "feature/1", fetchedAt: "2026-11-21T10:00:00.000Z", upstreamOrigin: "OpenStreetMap" }] },
    ];

    const candidates = findDuplicateCandidates(records, 25);

    expect(candidates[0].independentSources).toBe(1);
  });

  it("finds close points across longitude and polar grid boundaries", () => {
    const records = [
      { ...record("aed-east", "row-east", 179.9999), location: { latitude: 0, longitude: 179.9999 } },
      { ...record("aed-west", "row-west", -179.9999), location: { latitude: 0, longitude: -179.9999 } },
      { ...record("aed-pole-1", "row-pole-1", 0), location: { latitude: 89.9999, longitude: 0 } },
      { ...record("aed-pole-2", "row-pole-2", 90), location: { latitude: 89.9999, longitude: 90 } },
    ];

    const candidates = findDuplicateCandidates(records, 30);

    expect(candidates.map((candidate) => candidate.recordIds)).toEqual([
      ["aed-east", "aed-west"],
      ["aed-pole-1", "aed-pole-2"],
    ]);
  });

  it("uses spatial buckets instead of pairwise checks for a large national catalogue", () => {
    let locationReads = 0;
    const records = Array.from({ length: 1_200 }, (_, index) => {
      const item = record(`aed-${index}`, `row-${index}`, 14 + index * 0.02);
      const location = item.location;
      Object.defineProperty(item, "location", { get: () => { locationReads += 1; return location; } });
      return item;
    });

    const candidates = findDuplicateCandidates(records, 30);

    expect(candidates).toEqual([]);
    expect(locationReads).toBeLessThan(records.length * 2);
  });
});
