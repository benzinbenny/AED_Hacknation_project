import { describe, expect, it } from "vitest";
import { importAedGeoJson } from "../import/geojson";

const source = {
  id: "openaedmap-pl",
  name: "OpenAEDMap Polska",
  url: "https://openaedmap.org/api/v1/countries/PL.geojson",
  upstreamOrigin: "OpenStreetMap",
  licenseId: "ODbL-1.0",
  attribution: "© OpenStreetMap contributors",
};

const feature = {
  type: "Feature",
  id: "node/123",
  geometry: { type: "Point", coordinates: [21.01, 52.23] },
  properties: {
    emergency: "defibrillator",
    name: "AED testowy",
    access: "public",
    opening_hours: "24/7",
    indoor: "yes",
  },
};

describe("importAedGeoJson", () => {
  it("interprets GeoJSON coordinates as longitude then latitude", () => {
    const result = importAedGeoJson(
      { type: "FeatureCollection", features: [feature] },
      source,
      "2026-11-21T10:00:00.000Z",
    );

    expect(result.records[0].location).toEqual({ latitude: 52.23, longitude: 21.01 });
    expect(result.rejected).toBe(0);
  });

  it("does not infer operational status from 24/7 access hours", () => {
    const result = importAedGeoJson(
      { type: "FeatureCollection", features: [feature] },
      source,
      "2026-11-21T10:00:00.000Z",
    );

    expect(result.records[0].availability).toMatchObject({ rawHours: "24/7", state: "unknown" });
    expect(result.records[0].operationalStatus).toBe("unknown");
  });

  it("keeps the canonical identifier stable when coordinates change", () => {
    const first = importAedGeoJson(
      { type: "FeatureCollection", features: [feature] },
      source,
      "2026-11-21T10:00:00.000Z",
    );
    const movedFeature = {
      ...feature,
      geometry: { type: "Point", coordinates: [21.02, 52.24] },
    };
    const second = importAedGeoJson(
      { type: "FeatureCollection", features: [movedFeature] },
      source,
      "2026-11-22T10:00:00.000Z",
    );

    expect(second.records[0].id).toBe(first.records[0].id);
  });

  it("rejects invalid coordinates instead of silently swapping them", () => {
    const invalidFeature = {
      ...feature,
      geometry: { type: "Point", coordinates: [52.23, 191.01] },
    };
    const result = importAedGeoJson(
      { type: "FeatureCollection", features: [invalidFeature] },
      source,
      "2026-11-21T10:00:00.000Z",
    );

    expect(result.records).toHaveLength(0);
    expect(result.rejected).toBe(1);
    expect(result.issues[0].code).toBe("invalid_coordinates");
  });
});
