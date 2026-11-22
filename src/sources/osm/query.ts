type OsmType = "node" | "way" | "relation";

/** The Polish export supplies IDs only. Values embedded in it never become query syntax. */
export function buildOsmLookup(index: unknown): string {
  if (!index || typeof index !== "object" || !("features" in index) || !Array.isArray(index.features) || !index.features.length) {
    throw new Error("Brak identyfikatorów w polskim indeksie AED.");
  }
  const ids: Record<OsmType, Set<number>> = { node: new Set(), way: new Set(), relation: new Set() };
  for (const feature of index.features) {
    const type = feature?.properties?.["@osm_type"];
    const id = feature?.properties?.["@osm_id"];
    if ((type !== "node" && type !== "way" && type !== "relation") || !Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Polski indeks zwrócił niepoprawny identyfikator OSM.");
    }
    ids[type as OsmType].add(id);
  }
  const groups = Object.entries(ids).filter(([, values]) => values.size).map(([type, values]) => `${type}(id:${[...values].join(",")});`);
  return `[out:json][timeout:65];(${groups.join("")});out body center qt;`;
}
