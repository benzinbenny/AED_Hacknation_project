export type DiscoveredDataset = {
  id: string;
  title: string;
  url: string;
  license: string | null;
  formats: string[];
  modified: string | null;
};

export function registerDiscoveredSources(store: AedStore, datasets: DiscoveredDataset[]): AedStore {
  const sources = [...store.sources];
  const available = new Set(store.uninstalledSourceIds ?? []);
  const forgotten = new Set(store.forgottenSourceIds ?? []);
  for (const dataset of datasets) {
    const profile = AED_SOURCE_CATALOG.find((item) => (item.collection.kind === "dane-gov" && item.collection.datasetId === dataset.id) || item.catalogUrl === dataset.url);
    const id = profile?.id ?? `dane-gov-dataset-${dataset.id}`;
    if (store.deletedSourceIds?.includes(id)) continue;
    if (profile) {
      if (forgotten.delete(id)) available.add(id);
      continue;
    }
    if (!sources.some((source) => source.id === id)) {
      sources.push({ id, datasetId: dataset.id, name: dataset.title, url: dataset.url, upstreamOrigin: "dane.gov.pl", licenseId: dataset.license ?? "unknown", attribution: "", synthetic: false, licenseReviewStatus: "needs_review" });
      available.add(id);
    }
    forgotten.delete(id);
  }
  return { ...store, sources, uninstalledSourceIds: [...available], forgottenSourceIds: [...forgotten] };
}

export async function discoverAedDatasets(fetcher: typeof fetch = fetch): Promise<{ datasets: DiscoveredDataset[]; errors: string[] }> {
  const datasets = new Map<string, DiscoveredDataset>();
  const errors: string[] = [];
  for (const query of ["defibrylator", "AED"]) {
    try {
      for (let page = 1; page <= 5; page++) {
        const url = new URL("https://api.dane.gov.pl/1.4/datasets");
        url.searchParams.set("q", query);
        url.searchParams.set("per_page", "50");
        url.searchParams.set("page", String(page));
        const response = await fetcher(url, { headers: { accept: "application/vnd.api+json" }, signal: AbortSignal.timeout(20000), redirect: "error" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("data" in data) || !Array.isArray(data.data)) throw new Error("Nieprawidłowa odpowiedź API");
        for (const entry of data.data) {
          if (!entry || typeof entry !== "object") continue;
          const item = entry as { id?: unknown; attributes?: Record<string, unknown> };
          if (typeof item.id !== "string" || !/^\d+$/.test(item.id) || !item.attributes) continue;
          const title = typeof item.attributes.title === "string" ? item.attributes.title.replace(/<[^>]*>/g, "").trim() : "";
          const notes = typeof item.attributes.notes === "string" ? item.attributes.notes.replace(/<[^>]*>/g, " ") : "";
          if (!title || !/defibryl|defibrill|\baed\b/i.test(`${title} ${notes}`)) continue;
          datasets.set(item.id, {
            id: item.id, title, url: `https://dane.gov.pl/pl/dataset/${item.id}`,
            license: typeof item.attributes.license_name === "string" ? item.attributes.license_name : null,
            formats: Array.isArray(item.attributes.formats) ? item.attributes.formats.filter((value): value is string => typeof value === "string") : [],
            modified: typeof item.attributes.modified === "string" ? item.attributes.modified : null,
          });
        }
        const links = "links" in data && data.links && typeof data.links === "object" ? data.links as { next?: unknown } : null;
        if (!links?.next) break;
        if (page === 5) errors.push(`${query}: wyniki ograniczono do 250 zbiorów`);
      }
    } catch (error) {
      errors.push(`${query}: ${error instanceof Error ? error.message : "błąd połączenia"}`);
    }
  }
  return { datasets: [...datasets.values()], errors };
}
import { AED_SOURCE_CATALOG } from "./catalog";
import type { AedStore } from "../services/staging";

