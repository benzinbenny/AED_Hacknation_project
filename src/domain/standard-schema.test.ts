import { describe, expect, it } from "vitest";
import { AedRecordSchema } from "./types";

describe("canonical AED standard extension", () => {
  it("accepts optional placement, geography, and verification metadata", () => {
    const parsed = AedRecordSchema.safeParse({
      id: "11111111-1111-5111-8111-111111111111",
      name: null,
      operatorName: null,
      location: { latitude: 52.23, longitude: 21.01 },
      coordinateAccuracyMeters: 8,
      geography: { countryCode: "PL", voivodeship: "mazowieckie", county: null, municipality: "Warszawa", locality: null, postalCode: null, terytTerc: null, terytSimc: null },
      placement: { indoor: "yes", floor: "0", entranceDescription: "wejście od ulicy" },
      timezone: "Europe/Warsaw",
      address: null,
      locationDescription: null,
      accessType: "unknown",
      accessNotes: null,
      availability: { rawHours: null, state: "unknown", evaluatedAt: null },
      operationalStatus: "unknown",
      lastVerifiedAt: null,
      verificationMethod: null,
      verificationActorType: "unknown",
      verificationScope: "unknown",
      nextVerificationDueAt: null,
      recordStatus: "active",
      sources: [{ sourceId: "test", sourceRecordId: "1", fetchedAt: "2026-11-21T10:00:00Z" }],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.geography?.terytTerc).toBeNull();
  });
});
