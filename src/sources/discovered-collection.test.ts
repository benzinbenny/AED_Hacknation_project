import { expect, it, vi } from "vitest";
import { collectDiscoveredDataset } from "./collect";
import type { StoredSource } from "../services/staging";

const source: StoredSource = { id: "dane-gov-dataset-999", datasetId: "999", name: "Rejestr AED", url: "https://dane.gov.pl/pl/dataset/999", upstreamOrigin: "dane.gov.pl", licenseId: "unknown", attribution: "", synthetic: false, licenseReviewStatus: "needs_review" };

it("collects and normalizes a discovered CSV using its coordinate headers", async () => {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/datasets?id=999")) return Response.json({ data: [{ id: "999", attributes: { license_name: "CC0" } }] });
    if (url.includes("/datasets/999/resources")) return Response.json({ data: [{ id: "123", attributes: { format: "csv", download_url: "https://api.dane.gov.pl/resources/123,file" } }] });
    return new Response("id,name,latitude,longitude\n1,AED,52.2,21.0");
  });
  const result = await collectDiscoveredDataset(source, fetcher as typeof fetch);
  expect(result.result.records).toHaveLength(1);
  expect(result.result.records[0]).toMatchObject({ name: "AED", location: { latitude: 52.2, longitude: 21 } });
  expect(result.source.licenseId).toBe("CC0");
});

it("rejects CSV without recognized coordinate headers", async () => {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/datasets?id=999")) return Response.json({ data: [{ id: "999" }] });
    if (url.includes("/datasets/999/resources")) return Response.json({ data: [{ id: "123", attributes: { format: "csv", download_url: "https://api.dane.gov.pl/resources/123,file" } }] });
    return new Response("id,coords\n1,52.2;21.0");
  });
  await expect(collectDiscoveredDataset(source, fetcher as typeof fetch)).rejects.toThrow("Nie rozpoznano kolumn");
});
