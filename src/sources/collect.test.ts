import { describe, expect, it, vi } from "vitest";
import { collectAedSource } from "./collect";

const fetchedAt = "2026-11-21T12:00:00.000Z";

describe("collectAedSource", () => {
  it("fetches the configured portal resource and returns normalized records with live source metadata", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/1.4/datasets?id=3624")) {
        return Response.json({ data: [{ id: "3624", attributes: { license_name: "CC0 1.0" } }] });
      }
      if (url.includes("/1.4/datasets/3624/resources")) {
        return Response.json({ data: [{ id: "54632", attributes: { format: "csv", data_date: "2024-02-19", download_url: "https://api.dane.gov.pl/resources/54632,file" } }] });
      }
      if (url === "https://api.dane.gov.pl/resources/54632,file") {
        return new Response("Długość geograficzna,Szerokość geograficzna, Nazwa, Lokalizacja, Adres, Numer Id\n21.720344,49.718809,\"Defibrylator\",\"Basen\",\"ul. Jasna, Krosno\",\"1\"", { headers: { "content-type": "application/octet-stream" } });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const collected = await collectAedSource("dane-gov-krosno", { fetcher, now: () => new Date(fetchedAt) });

    expect(collected.result.records).toHaveLength(1);
    expect(collected.source.licenseId).toBe("CC0 1.0");
    expect(collected.source.referenceScope?.sourceDataDate).toBe("2024-02-19");
    expect(collected.result.records[0].location).toEqual({ latitude: 49.718809, longitude: 21.720344 });
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
