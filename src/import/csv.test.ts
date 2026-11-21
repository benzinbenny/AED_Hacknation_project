import { describe, expect, it } from "vitest";
import { importAedCsv } from "./csv";
import type { SourceDescriptor } from "../domain/types";

const source: SourceDescriptor = {
  id: "municipal-csv",
  name: "Plik dysponenta",
  url: "https://example.invalid/aed.csv",
  upstreamOrigin: "Dysponent testowy",
  licenseId: "unknown",
  attribution: "Dane demonstracyjne",
};

const mapping = {
  sourceRecordId: "ID",
  name: "Nazwa AED",
  latitude: "lat",
  longitude: "lon",
  openingHours: "Godziny",
};

describe("importAedCsv", () => {
  it("handles UTF-8 BOM, semicolon separators, Polish text, and mapped columns", () => {
    const csv = "\uFEFFID;Nazwa AED;lat;lon;Godziny\r\nmarki-1;AED Łódź;52.23;21.01;24/7";

    const result = importAedCsv(csv, source, mapping, "2026-11-21T10:00:00.000Z");

    expect(result.records).toHaveLength(1);
    expect(result.records[0].name).toBe("AED Łódź");
    expect(result.records[0].location).toEqual({ latitude: 52.23, longitude: 21.01 });
    expect(result.records[0].availability.rawHours).toBe("24/7");
    expect(result.records[0].operationalStatus).toBe("unknown");
  });

  it("rejects an invalid coordinate without silently swapping it", () => {
    const csv = "ID;Nazwa AED;lat;lon\r\nmarki-1;AED;52.23;191.01";

    const result = importAedCsv(csv, source, { ...mapping, openingHours: undefined }, "2026-11-21T10:00:00.000Z");

    expect(result.records).toHaveLength(0);
    expect(result.rejected).toBe(1);
    expect(result.issues[0].code).toBe("invalid_coordinates");
  });

  it("maps the shared administrative, access, and verification fields without dropping TERYT leading zeroes", () => {
    const csv = "id,latitude,longitude,teryt_terc,teryt_simc,indoor,verification_scope,coordinate_accuracy_m\nrow-1,52.23,21.01,0918011,0918123,yes,location,4.5";
    const result = importAedCsv(csv, { ...source, referenceScope: { geographyLabel: "Warszawa", geographyLevel: "municipality", temporalDescription: "Stan danych", sourceDataDate: "2026-11-20", updateFrequency: "codziennie", basis: "publisher_declared", limitations: "Nie obejmuje danych prywatnych" } }, {
      sourceRecordId: "id", name: "", latitude: "latitude", longitude: "longitude", terytTerc: "teryt_terc", terytSimc: "teryt_simc", indoor: "indoor", verificationScope: "verification_scope", coordinateAccuracyMeters: "coordinate_accuracy_m",
    }, "2026-11-21T10:00:00.000Z");

    expect(result.records).toHaveLength(1);
    expect(result.records[0].geography?.terytTerc).toBe("0918011");
    expect(result.records[0].geography?.terytSimc).toBe("0918123");
    expect(result.records[0].placement?.indoor).toBe("yes");
    expect(result.records[0].coordinateAccuracyMeters).toBe(4.5);
    expect(result.records[0].sources[0].sourceDataDate).toBe("2026-11-20");
  });
});
