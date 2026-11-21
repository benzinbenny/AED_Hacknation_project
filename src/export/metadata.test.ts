import { describe, expect, it } from "vitest";
import { createPublicationMetadata } from "./metadata";

describe("createPublicationMetadata", () => {
  it("describes the AED package through JSON-LD distributions and transparent provenance", () => {
    const metadata = createPublicationMetadata({
      baseUrl: "https://punktzycia.example",
      sourceCount: 6,
      modifiedAt: "2026-11-21T12:00:00.000Z",
    });

    expect(metadata["@context"]).toBe("https://www.w3.org/ns/dcat.jsonld");
    expect(metadata["@type"]).toBe("dcat:Dataset");
    expect(metadata["dct:title"]).toContain("AED");
    expect(metadata["dct:provenance"]).toContain("źródeł");
    expect(metadata["dcat:distribution"]).toEqual(expect.arrayContaining([
      expect.objectContaining({ "dct:format": "text/csv", "dcat:accessURL": "https://punktzycia.example/api/export/csv" }),
      expect.objectContaining({ "dct:format": "application/geo+json", "dcat:accessURL": "https://punktzycia.example/api/export/geojson" }),
      expect.objectContaining({ "dct:format": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    ]));
    expect(metadata["dct:description"]).toContain("nie gwarantuje kompletności");
  });
});
