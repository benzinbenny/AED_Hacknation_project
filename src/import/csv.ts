import Papa from "papaparse";
import { createHash } from "node:crypto";
import type { SourceDescriptor } from "../domain/types";
import { importAedGeoJson } from "./geojson";

export type CsvFieldMapping = {
  sourceRecordId: string;
  name: string;
  latitude: string;
  longitude: string;
  operatorName?: string;
  address?: string;
  locationDescription?: string;
  access?: string;
  accessNotes?: string;
  openingHours?: string;
  operationalStatus?: string;
  lastVerifiedAt?: string;
  verificationMethod?: string;
  externalReference?: string;
  coordinateAccuracyMeters?: string;
  countryCode?: string;
  voivodeship?: string;
  county?: string;
  municipality?: string;
  locality?: string;
  postalCode?: string;
  terytTerc?: string;
  terytSimc?: string;
  indoor?: string;
  floor?: string;
  entranceDescription?: string;
  timezone?: string;
  availabilityState?: string;
  availabilityEvaluatedAt?: string;
  operationalStatusObservedAt?: string;
  verificationActorType?: string;
  verificationScope?: string;
  nextVerificationDueAt?: string;
  recordStatus?: string;
  sourceUpdatedAt?: string;
};

function stringValue(row: Record<string, unknown>, column: string | undefined): string | null {
  if (!column) return null;
  const value = row[column];
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function coordinateValue(row: Record<string, unknown>, column: string): number {
  const raw = stringValue(row, column);
  if (!raw) return Number.NaN;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  return Number(normalized);
}

function fallbackRecordId(sourceId: string, row: Record<string, unknown>): string {
  const digest = createHash("sha256").update(sourceId).update("\0").update(JSON.stringify(row)).digest("hex").slice(0, 20);
  return `content:${digest}`;
}

export function importAedCsv(
  csvText: string,
  source: SourceDescriptor,
  mapping: CsvFieldMapping,
  fetchedAt: string,
) {
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: (header) => header.trim(),
  });
  const features = parsed.data.map((row, index) => {
    const sourceRecordId = stringValue(row, mapping.sourceRecordId) ?? fallbackRecordId(source.id, row);
    const id = mapping.sourceRecordId && stringValue(row, mapping.sourceRecordId) ? sourceRecordId : `row/${sourceRecordId}`;
    return {
      type: "Feature",
      id,
      geometry: {
        type: "Point",
        coordinates: [coordinateValue(row, mapping.longitude), coordinateValue(row, mapping.latitude)],
      },
      properties: {
        source_record_id: sourceRecordId,
        name: stringValue(row, mapping.name),
        external_reference: stringValue(row, mapping.externalReference),
        operator: stringValue(row, mapping.operatorName),
        coordinate_accuracy_m: coordinateValue(row, mapping.coordinateAccuracyMeters ?? ""),
        country_code: stringValue(row, mapping.countryCode),
        voivodeship: stringValue(row, mapping.voivodeship),
        county: stringValue(row, mapping.county),
        municipality: stringValue(row, mapping.municipality),
        locality: stringValue(row, mapping.locality),
        postal_code: stringValue(row, mapping.postalCode),
        teryt_terc: stringValue(row, mapping.terytTerc),
        teryt_simc: stringValue(row, mapping.terytSimc),
        "addr:full": stringValue(row, mapping.address),
        location_description: stringValue(row, mapping.locationDescription),
        access: stringValue(row, mapping.access),
        access_notes: stringValue(row, mapping.accessNotes),
        indoor: stringValue(row, mapping.indoor),
        floor: stringValue(row, mapping.floor),
        entrance_description: stringValue(row, mapping.entranceDescription),
        timezone: stringValue(row, mapping.timezone),
        opening_hours: stringValue(row, mapping.openingHours),
        availability_state: stringValue(row, mapping.availabilityState),
        availability_evaluated_at: stringValue(row, mapping.availabilityEvaluatedAt),
        operational_status: stringValue(row, mapping.operationalStatus),
        operational_status_observed_at: stringValue(row, mapping.operationalStatusObservedAt),
        last_verified_at: stringValue(row, mapping.lastVerifiedAt),
        verification_method: stringValue(row, mapping.verificationMethod),
        verification_actor_type: stringValue(row, mapping.verificationActorType),
        verification_scope: stringValue(row, mapping.verificationScope),
        next_verification_due_at: stringValue(row, mapping.nextVerificationDueAt),
        record_status: stringValue(row, mapping.recordStatus),
        source_updated_at: stringValue(row, mapping.sourceUpdatedAt),
        import_row: index + 1,
      },
    };
  });

  const result = importAedGeoJson({ type: "FeatureCollection", features }, source, fetchedAt);
  for (const error of parsed.errors) {
    result.issues.push({
      code: "invalid_feature",
      severity: "warning",
      message: `CSV: ${error.message}`,
      sourceRecordId: typeof error.row === "number" && error.row >= 0 ? String(error.row + 1) : null,
    });
  }
  return result;
}
