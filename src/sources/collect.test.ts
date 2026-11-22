import { describe, expect, it, vi } from "vitest";
import { collectAedSource } from "./collect";

const fetchedAt = "2026-11-21T12:00:00.000Z";

describe("collectAedSource", () => {
  it("imports OSM nodes and area centers with stable type-specific IDs and a shared OSM origin", async () => {
    const tags = { emergency: "defibrillator", access: "yes", "defibrillator:location": "Recepcja" };
    const elements = [
      { type: "node", id: 123, lat: 52, lon: 21, tags },
      { type: "way", id: 123, center: { lat: 51, lon: 20 }, tags },
      { type: "relation", id: 123, center: { lat: 50, lon: 19 }, tags },
      { type: "way", id: 124, tags },
    ];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("https://openaedmap.org/")) return Response.json({
        features: elements.map((e) => ({ properties: { "@osm_type": e.type, "@osm_id": e.id } })),
      });
      expect(init?.method).toBe("POST");
      expect(init?.body?.toString()).toBe(new URLSearchParams({ data: "[out:json][timeout:65];(node(id:123);way(id:123,124);relation(id:123););out body center qt;" }).toString());
      return Response.json({ elements, osm3s: { timestamp_osm_base: fetchedAt } });
    });
    const collected = await collectAedSource("osm-pl", { fetcher });
    expect(collected.result.rejected).toBe(1);
    const records = collected.result.records;
    expect(records.map((r) => r.sources[0].sourceRecordId)).toEqual(["node/123", "way/123", "relation/123"]);
    expect(records[1].location).toEqual({ latitude: 51, longitude: 20 });
    expect(records[0]).toMatchObject({ accessType: "public", locationDescription: "Recepcja", operationalStatus: "unknown" });
    expect(records[0].sources[0]).toMatchObject({ sourceUrl: "https://www.openstreetmap.org/node/123", upstreamOrigin: "OpenStreetMap", licenseId: "ODbL-1.0", sourceDataDate: "2026-11-21" });
  });

  it("rejects a partial Overpass result even when it returns HTTP 200", async () => {
    await expect(collectAedSource("osm-pl", { fetcher: async (url) => Response.json(String(url).startsWith("https://openaedmap.org/")
      ? { features: [{ properties: { "@osm_type": "node", "@osm_id": 42 } }] }
      : { remark: "timeout", elements: [] }) })).rejects.toThrow("niepełny");
  });
  it("fetches the configured portal resource and returns normalized records with live source metadata", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/1.4/datasets?id=3624")) {
        return Response.json({ data: [{ id: "3624", attributes: { license_name: "CC BY 4.0" } }] });
      }
      if (url.includes("/1.4/datasets/3624/resources")) {
        return Response.json({ data: [{ id: "54632", attributes: { format: "csv", data_date: "2026-11-20", download_url: "https://api.dane.gov.pl/resources/54632,file" } }] });
      }
      if (url === "https://api.dane.gov.pl/resources/54632,file") {
        return new Response("Długość geograficzna,Szerokość geograficzna, Nazwa, Lokalizacja, Adres, Numer Id\n21.720344,49.718809,\"Defibrylator\",\"Basen\",\"ul. Jasna, Krosno\",\"1\"", { headers: { "content-type": "application/octet-stream" } });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const collected = await collectAedSource("dane-gov-krosno", { fetcher, now: () => new Date(fetchedAt) });

    expect(collected.result.records).toHaveLength(1);
    expect(collected.source.licenseId).toBe("CC BY 4.0");
    expect(collected.source.referenceScope?.sourceDataDate).toBe("2026-11-20");
    expect(collected.result.records[0].location).toEqual({ latitude: 49.718809, longitude: 21.720344 });
    expect(collected.result.records[0].sources[0]).toMatchObject({
      licenseId: "CC BY 4.0",
      sourceDataDate: "2026-11-20",
      attribution: "Urząd Miasta Krosna, dane.gov.pl (CC BY 4.0)",
    });
  });

  it("reads the single-column CSV envelope of the archived Marki resource", async () => {
    const csv = [
      '"Długość geograficzna,Szerokość geograficzna, Nazwa, Lokalizacja, Adres, Numer Id"',
      '"52.326697, 21.107557,""Defibrylator"",""Urząd Miasta Marki "",""Al.. Piłsudskiego 95, 05-270 Marki"",""1"""',
      '"21.720344,49.718809,""Defibrylator"",""Szkoła"",""ul. Przykładowa 1, Marki"",""7"""',
    ].join("\n");
    const fetcher = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/datasets?id=4955")) return Response.json({ data: [{ id: "4955" }] });
      if (url.includes("/datasets/4955/resources")) return Response.json({ data: [{ id: "68353", attributes: {
        format: "csv", download_url: "https://api.dane.gov.pl/resources/68353,file",
      } }] });
      return new Response(csv, { headers: { "content-type": "text/csv" } });
    };
    const { result } = await collectAedSource("dane-gov-marki", { fetcher });
    expect(result.records).toHaveLength(2);
    expect(result.records[0].address).toBe("Al.. Piłsudskiego 95, 05-270 Marki");
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "outside_poland", sourceRecordId: "7" }));
  });

  it("rejects a redirect outside the configured source host", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://attacker.example/collect" } }));

    await expect(collectAedSource("openaedmap-pl", { fetcher, now: () => new Date(fetchedAt) }))
      .rejects.toThrow("niedozwolonego hosta");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects HTML returned in place of the configured CSV resource", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/1.4/datasets?id=3624")) return Response.json({ data: [{ id: "3624", attributes: { license_name: "CC0 1.0" } }] });
      if (url.includes("/1.4/datasets/3624/resources")) return Response.json({ data: [{ id: "54632", attributes: { format: "csv", data_date: "2024-02-19", download_url: "https://api.dane.gov.pl/resources/54632,file" } }] });
      return new Response("<html>error page</html>", { headers: { "content-type": "text/html" } });
    });

    await expect(collectAedSource("dane-gov-krosno", { fetcher, now: () => new Date(fetchedAt) }))
      .rejects.toThrow("Format odpowiedzi");
  });

  it("does not call the Warsaw API without a configured token", async () => {
    const fetcher = vi.fn();

    await expect(collectAedSource("warszawa-scb-aed", { fetcher, warsawToken: "", now: () => new Date(fetchedAt) }))
      .rejects.toThrow("wymaga tokenu");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
