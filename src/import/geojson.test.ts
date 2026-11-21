import { describe, expect, it } from "vitest";
import type { SourceDescriptor } from "../domain/types";
import { importAedGeoJson } from "./geojson";

const source: SourceDescriptor = {
  id: "openaedmap-pl",
  name: "OpenAEDMap — Polska",
  url: "https://openaedmap.org/api/v1/countries/PL.geojson",
  upstreamOrigin: "OpenStreetMap",
  licenseId: "ODbL-1.0",
  attribution: "© OpenStreetMap contributors",
};

describe("importAedGeoJson", () => {
  it("uses OpenStreetMap element type and ID as a stable source reference", () => {
    const result = importAedGeoJson({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [21.01, 52.23] },
        properties: {
          "@osm_type": "node",
          "@osm_id": 123,
          emergency: "defibrillator",
          "defibrillator:location": "Przy wejściu",
          email: "should-not-be-imported@example.test",
          phone: "+48123456789",
        },
      }],
    }, source, "2026-11-21T12:00:00.000Z");

    expect(result.records).toHaveLength(1);
    expect(result.records[0].sources[0].sourceRecordId).toBe("node/123");
    expect(result.records[0].locationDescription).toBe("Przy wejściu");
    expect(result.records[0]).not.toHaveProperty("email");
    expect(result.records[0]).not.toHaveProperty("phone");
  });

  it("normalizes municipal GeoJSON IDs and builds an address from published fields", () => {
    const result = importAedGeoJson({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [22.7750936, 49.7812096] },
        properties: {
          id: 744,
          name: "AED w ADM Centrum",
          city: "Przemyśl",
          street: "Juliusza Słowackiego",
          home_number: "12",
          postcode: "37-700",
          phone: "+48123456789",
          email: "should-not-be-imported@example.test",
        },
      }],
    }, { ...source, id: "dane-gov-przemysl", name: "Miasto Przemyśl", upstreamOrigin: "Urząd Miejski w Przemyślu", licenseId: "CC0 1.0" }, "2026-11-21T12:00:00.000Z");

    expect(result.records).toHaveLength(1);
    expect(result.records[0].sources[0].sourceRecordId).toBe("744");
    expect(result.records[0].address).toBe("Juliusza Słowackiego 12, 37-700 Przemyśl");
    expect(result.records[0]).not.toHaveProperty("email");
    expect(result.records[0]).not.toHaveProperty("phone");
  });
});
