import type { ImportResult } from "../domain/types";
import { importAedCsv } from "../import/csv";
import { importAedGeoJson } from "../import/geojson";
import { getAedSourceProfile, sourceDescriptor } from "./catalog";

const emptyResult = (message: string): ImportResult => ({
  records: [],
  rejected: 1,
  issues: [{ code: "invalid_feature", severity: "error", message, sourceRecordId: null }],
});

function unwrapQuotedRows(csv: string): string {
  return csv.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => {
    if (line.length < 2 || line[0] !== '"' || line[line.length - 1] !== '"') return line;
    return line.slice(1, -1).replace(/""/g, '"');
  }).join("\n");
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

export function normalizeSourcePayload(sourceId: string, payload: unknown, fetchedAt: string): ImportResult {
  const profile = getAedSourceProfile(sourceId);
  if (!profile) return emptyResult("Nieznany, niezarejestrowany profil źródła AED.");
  const source = sourceDescriptor(profile);
  const normalizedPayload = profile.collection.kind === "warsaw-api" ? normalizeWarsawPayload(payload) : payload;

  if (profile.collection.format === "csv") {
    if (typeof normalizedPayload !== "string") return emptyResult("Źródło miało zwrócić plik CSV, ale odpowiedź nie jest tekstem.");
    const csvText = sourceId === "dane-gov-marki" ? unwrapQuotedRows(normalizedPayload) : normalizedPayload;
    return importAedCsv(csvText, source, profile.collection.mapping!, fetchedAt);
  }

  return importAedGeoJson(normalizedPayload, source, fetchedAt);
}

