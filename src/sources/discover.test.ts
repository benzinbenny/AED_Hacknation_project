import { expect, it, vi } from "vitest";
import { discoverAedDatasets, registerDiscoveredSources } from "./discover";
import { createEmptyStore } from "../services/staging";

it("finds paginated datasets, deduplicates them and reports partial errors", async () => {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.searchParams.get("q") === "AED") throw new Error("offline");
    if (url.searchParams.get("page") === "2") return Response.json({ data: [{ id: "2", attributes: { title: "AED szkoła", formats: ["csv"] } }], links: { next: null } });
    return Response.json({ data: [
      { id: "1", attributes: { title: "<mark>Defibrylator</mark> miasta", license_name: "CC0", formats: ["csv"] } },
      { id: "1", attributes: { title: "Defibrylator miasta", formats: ["csv"] } },
      { id: "../bad", attributes: { title: "AED" } },
      { id: "3", attributes: { title: "Inne dane" } },
    ], links: { next: "https://api.dane.gov.pl/1.4/datasets?page=2" } });
  });
  const result = await discoverAedDatasets(fetcher as typeof fetch);
  expect(result.datasets.map((item) => item.id)).toEqual(["1", "2"]);
  expect(result.datasets[0].url).toBe("https://dane.gov.pl/pl/dataset/1");
  expect(result.errors).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it("registers new datasets as uninstalled without resurrecting deleted sources", () => {
  const dataset = { id: "999", title: "Rejestr AED", url: "https://dane.gov.pl/pl/dataset/999", license: "CC0", formats: ["csv"], modified: null };
  const first = registerDiscoveredSources(createEmptyStore(), [dataset]);
  expect(first.sources[0]).toMatchObject({ id: "dane-gov-dataset-999", datasetId: "999", licenseReviewStatus: "needs_review" });
  expect(first.uninstalledSourceIds).toContain("dane-gov-dataset-999");
  const installed = { ...first, uninstalledSourceIds: [] };
  expect(registerDiscoveredSources(installed, [dataset]).uninstalledSourceIds).toEqual([]);
  const removed = { ...first, deletedSourceIds: ["dane-gov-dataset-999"], uninstalledSourceIds: [] };
  expect(registerDiscoveredSources(removed, [dataset]).deletedSourceIds).toEqual(["dane-gov-dataset-999"]);
});
