import { describe, expect, it } from "vitest";
import { AED_SOURCE_CATALOG, getAedSourceProfile } from "./catalog";

describe("AED source catalogue", () => {
  it("states geographic and temporal reference scope for each known source", () => {
    expect(AED_SOURCE_CATALOG.map((source) => source.id)).toEqual([
      "osm-pl",
      "openaedmap-pl",
      "dane-gov-krosno",
      "dane-gov-marki",
      "dane-gov-przemysl",
      "warszawa-scb-aed",
    ]);
    for (const source of AED_SOURCE_CATALOG) {
      expect(source.referenceScope.geographyLabel).not.toBe("");
      expect(source.referenceScope.temporalDescription).not.toBe("");
      expect(source.referenceScope.updateFrequency).not.toBe("");
    }
  });

  it("keeps the documented Marki coordinate-header exception source-specific", () => {
    const marki = getAedSourceProfile("dane-gov-marki");
    if (!marki || marki.collection.kind !== "dane-gov") throw new Error("Marki CSV profile is missing");

    expect(marki.collection.mapping).toMatchObject({
      latitude: "Długość geograficzna",
      longitude: "Szerokość geograficzna",
    });
    expect(marki.referenceScope.geographyLabel).toContain("Marki");
  });

  it("marks Warsaw collection unavailable without its API token", () => {
    const warsaw = getAedSourceProfile("warszawa-scb-aed");

    expect(warsaw?.collection.kind).toBe("warsaw-api");
    expect(warsaw?.collection.requiresToken).toBe(true);
  });
});
