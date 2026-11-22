import type { ImportResult, SourceDescriptor } from "../domain/types";
import { importAedCsv } from "../import/csv";
import { importAedGeoJson } from "../import/geojson";
import { getAedSourceProfile, sourceDescriptor } from "./catalog";

const emptyResult = (message: string): ImportResult => ({
  records: [],
  rejected: 1,
  issues: [{ code: "invalid_feature", severity: "error", message, sourceRecordId: null }],
});

function normalizeCsvInput(csv: string): string {
  return csv.replace(/^\uFEFF/, "");
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeWarsawPayload(input: unknown): unknown {
  const rows = Array.isArray(input)
    ? input
    : objectRecord(input)?.type === "FeatureCollection" && Array.isArray(objectRecord(input)?.features)
      ? objectRecord(input)?.features as unknown[]
      : null;
  if (!rows) return input;

  return {
    type: "FeatureCollection",
    features: rows.map((row) => {
      const item = objectRecord(row);
      const properties = objectRecord(item?.properties) ?? {};
      const geometry = objectRecord(item?.geometry);
      const rawCoordinates = geometry?.coordinates;
      const coordinates = Array.isArray(rawCoordinates) && Array.isArray(rawCoordinates[0])
        ? rawCoordinates[0]
        : rawCoordinates;
      const address = [
        [properties.location_street, properties.location_building]
          .filter((part) => typeof part === "string" && part.trim().length > 0).join(" "),
        [properties.location_postcode, properties.location_city]
          .filter((part) => typeof part === "string" && part.trim().length > 0).join(" "),
      ].filter(Boolean).join(", ");

      return {
        type: "Feature",
        id: properties.defibrillator_id,
        geometry: { type: geometry?.type ?? "Point", coordinates },
        properties: {
          source_record_id: properties.defibrillator_id,
          name: properties.location_object_name,
          "addr:full": address,
          location_description: properties.location_description ?? properties.device_location,
          access: properties.device_public_access,
          access_notes: properties.device_access_description,
          opening_hours: properties.device_access_description,
        },
      };
    }),
  };
}

export function normalizeSourcePayload(sourceId: string, payload: unknown, fetchedAt: string, resolvedSource?: SourceDescriptor): ImportResult {
  const profile = getAedSourceProfile(sourceId);
  if (!profile) return emptyResult("Nieznany, niezarejestrowany profil źródła AED.");
  const source = resolvedSource ?? sourceDescriptor(profile);
  if (profile.collection.kind === "osm-overpass") {
    const elements = objectRecord(payload)?.elements;
    if (!Array.isArray(elements)) return emptyResult("Brak listy obiektów OSM.");
    const features = elements.filter((value) => objectRecord(objectRecord(value)?.tags)?.emergency === "defibrillator").map((value) => {
      const item = objectRecord(value);
      const tags = objectRecord(item?.tags);
      if (!item || tags?.emergency !== "defibrillator" || !["node", "way", "relation"].includes(String(item.type))) return null;
      const point = item.type === "node" ? item : objectRecord(item.center);
      return {
        type: "Feature",
        id: Number.isSafeInteger(item.id) && Number(item.id) > 0 ? `${item.type}/${item.id}` : null,
        geometry: { type: "Point", coordinates: [point?.lon, point?.lat] },
        properties: {
          name: tags.name, operator: tags.operator, access: tags.access, opening_hours: tags.opening_hours,
          indoor: tags.indoor, level: tags.level, ref: tags.ref,
          location_description: tags["defibrillator:location:pl"] ?? tags["defibrillator:location"] ?? tags.description,
          "addr:full": tags["addr:full"], "addr:street": tags["addr:street"], "addr:housenumber": tags["addr:housenumber"],
          "addr:city": tags["addr:city"], "addr:postcode": tags["addr:postcode"],
        },
      };
    });
    const result = importAedGeoJson({ type: "FeatureCollection", features }, source, fetchedAt);
    for (const record of result.records) {
      const reference = record.sources[0];
      reference.sourceUrl = `https://www.openstreetmap.org/${reference.sourceRecordId}`;
    }
    return result;
  }
  const normalizedPayload = profile.collection.kind === "warsaw-api" ? normalizeWarsawPayload(payload) : payload;

  if (profile.collection.format === "csv") {
    if (typeof normalizedPayload !== "string") return emptyResult("Źródło miało zwrócić plik CSV, ale odpowiedź nie jest tekstem.");
    const csvText = normalizeCsvInput(normalizedPayload);
    return importAedCsv(csvText, source, profile.collection.mapping!, fetchedAt);
  }

  return importAedGeoJson(normalizedPayload, source, fetchedAt);
}

