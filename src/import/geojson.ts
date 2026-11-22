import { createHash } from "node:crypto";
import { AedRecordSchema, type AedRecord, type ImportIssue, type ImportResult, type SourceDescriptor } from "../domain/types";

const URL_NAMESPACE = Buffer.from("6ba7b8119dad11d180b400c04fd430c8", "hex");

function stableAedId(sourceId: string, sourceRecordId: string): string {
  const bytes = createHash("sha1").update(URL_NAMESPACE).update(`aed:${sourceId}:${sourceRecordId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function mapAccess(value: string | null): AedRecord["accessType"] {
  switch (value?.toLowerCase()) {
    case "public":
    case "publiczny":
    case "ogólnodostępny":
    case "ogolnodostepny":
    case "yes":
    case "permissive":
      return "public";
    case "customers":
    case "klienci":
      return "customers";
    case "restricted":
    case "ograniczony":
    case "ograniczona":
      return "restricted";
    case "private":
    case "no":
      return "private";
    default:
      return "unknown";
  }
}

function mapOperationalStatus(value: string | null): AedRecord["operationalStatus"] {
  switch (value?.toLowerCase()) {
    case "yes":
    case "operational":
    case "in_service":
    case "reported_operational":
      return "reported_operational";
    case "no":
    case "out_of_service":
    case "reported_out_of_service":
      return "reported_out_of_service";
    default:
      return "unknown";
  }
}

function mapAvailabilityState(value: string | null): AedRecord["availability"]["state"] {
  switch (value?.toLowerCase()) {
    case "open_by_schedule": return "open_by_schedule";
    case "closed_by_schedule": return "closed_by_schedule";
    default: return "unknown";
  }
}

function mapRecordStatus(value: string | null): AedRecord["recordStatus"] {
  switch (value?.toLowerCase()) {
    case "active": return "active";
    case "temporarily_removed": return "temporarily_removed";
    case "removed": return "removed";
    default: return "unknown";
  }
}

function getSourceRecordId(feature: Record<string, unknown>, properties: Record<string, unknown>): string | null {
  const osmId = asText(properties["@osm_id"]);
  const osmType = asText(properties["@osm_type"]);
  return asText(feature.id)
    ?? asText(properties["@id"])
    ?? asText(properties.source_record_id)
    ?? (osmId ? `${osmType ?? "osm"}/${osmId}` : null)
    ?? asText(properties.id);
}

function rawHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function positiveNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function indoorValue(value: string | null): "yes" | "no" | "unknown" | undefined {
  switch (value?.toLowerCase()) {
    case "yes": case "indoor": case "tak": return "yes";
    case "no": case "outdoor": case "nie": return "no";
    default: return value ? "unknown" : undefined;
  }
}

function enumValue<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? value as T : allowed[allowed.length - 1];
}

export type GeoJsonImportOptions = {
  preserveRowProvenance?: boolean;
};

export function importAedGeoJson(input: unknown, source: SourceDescriptor, fetchedAt: string, options: GeoJsonImportOptions = {}): ImportResult {
  const records: AedRecord[] = [];
  const issues: ImportIssue[] = [];
  let rejected = 0;

  if (!input || typeof input !== "object" || (input as { type?: unknown }).type !== "FeatureCollection" || !Array.isArray((input as { features?: unknown }).features)) {
    return {
      records,
      rejected: 1,
      issues: [{ code: "invalid_feature", severity: "error", message: "Plik nie jest poprawnym GeoJSON FeatureCollection.", sourceRecordId: null }],
    };
  }

  const features = (input as { features: unknown[] }).features;
  features.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      rejected += 1;
      issues.push({ code: "invalid_feature", severity: "error", message: `Rekord ${index + 1} nie jest obiektem Feature.`, sourceRecordId: null });
      return;
    }

    const feature = item as Record<string, unknown>;
    const geometry = feature.geometry as { type?: unknown; coordinates?: unknown } | null;
    const properties = feature.properties && typeof feature.properties === "object" ? feature.properties as Record<string, unknown> : {};
    const sourceRecordId = getSourceRecordId(feature, properties);

    if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
      rejected += 1;
      issues.push({ code: "unsupported_geometry", severity: "error", message: "Obsługiwane są wyłącznie punkty GeoJSON.", sourceRecordId });
      return;
    }
    if (!sourceRecordId) {
      rejected += 1;
      issues.push({ code: "missing_source_record_id", severity: "error", message: "Brakuje stabilnego identyfikatora rekordu źródłowego.", sourceRecordId: null });
      return;
    }

    const [longitude, latitude] = geometry.coordinates;
    if (typeof longitude !== "number" || typeof latitude !== "number" || !Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      rejected += 1;
      issues.push({ code: "invalid_coordinates", severity: "error", message: "Współrzędne nie mieszczą się w prawidłowym zakresie długości i szerokości geograficznej.", sourceRecordId });
      return;
    }

    if (latitude < 49 || latitude > 55 || longitude < 14 || longitude > 25) {
      issues.push({ code: "outside_poland", severity: "warning", message: "Punkt leży poza przybliżonym zakresem terytorium Polski; sprawdź kolejność i źródło współrzędnych.", sourceRecordId });
    }

    const street = asText(properties["addr:street"] ?? properties.street);
    const buildingNumber = asText(properties["addr:housenumber"] ?? properties.home_number);
    const postcode = asText(properties["addr:postcode"] ?? properties.postal_code ?? properties.postcode);
    const city = asText(properties["addr:city"] ?? properties.city);
    const address = asText(properties["addr:full"]) ?? ([
      [street, buildingNumber].filter((part): part is string => part !== null).join(" "),
      [postcode, city].filter((part): part is string => part !== null).join(" "),
    ].filter(Boolean).join(", ") || null);
    const proposed = {
      id: stableAedId(source.id, sourceRecordId),
      name: asText(properties.name),
      externalReference: asText(properties.ref ?? properties.external_reference),
      operatorName: asText(properties.operator),
      location: { latitude, longitude },
      coordinateAccuracyMeters: positiveNumber(properties.coordinate_accuracy_m ?? properties.position_accuracy),
      geography: {
        countryCode: asText(properties.country_code),
        voivodeship: asText(properties.voivodeship ?? properties["addr:state"]),
        county: asText(properties.county ?? properties["addr:county"]),
        municipality: asText(properties.municipality),
        locality: asText(properties.locality ?? properties["addr:city"] ?? properties.city),
        postalCode: asText(properties["addr:postcode"] ?? properties.postcode),
        terytTerc: asText(properties.teryt_terc ?? properties.TERYT_TERC),
        terytSimc: asText(properties.teryt_simc ?? properties.TERYT_SIMC),
      },
      placement: {
        indoor: indoorValue(asText(properties.indoor)),
        floor: asText(properties.floor ?? properties.level),
        entranceDescription: asText(properties.entrance_description),
      },
      timezone: asText(properties.timezone),
      address,
      locationDescription: asText(properties.location_description)
        ?? asText(properties["defibrillator:location"])
        ?? asText(properties.description)
        ?? asText(properties.indoor),
      accessType: mapAccess(asText(properties.access)),
      accessNotes: asText(properties.access_notes),
      availability: {
        rawHours: asText(properties.opening_hours),
        state: mapAvailabilityState(asText(properties.availability_state)),
        evaluatedAt: asText(properties.availability_evaluated_at),
      },
      operationalStatus: mapOperationalStatus(asText(properties.operational_status) ?? asText(properties.operational)),
      operationalStatusObservedAt: asText(properties.operational_status_observed_at),
      lastVerifiedAt: asText(properties.last_verified_at),
      verificationMethod: asText(properties.verification_method),
      verificationActorType: enumValue(asText(properties.verification_actor_type), ["publisher", "field_community", "automated_import", "unknown"] as const),
      verificationScope: enumValue(asText(properties.verification_scope), ["location", "access", "operational_status", "full", "unknown"] as const),
      nextVerificationDueAt: asText(properties.next_verification_due_at),
      recordStatus: mapRecordStatus(asText(properties.record_status)),
      sources: [{
        sourceId: source.id,
        upstreamSourceId: options.preserveRowProvenance ? asText(properties.source_id) : null,
        sourceRecordId,
        fetchedAt: options.preserveRowProvenance ? asText(properties.fetched_at) ?? fetchedAt : fetchedAt,
        sourceDataDate: source.referenceScope?.sourceDataDate ?? null,
        sourceUpdatedAt: asText(properties.source_updated_at),
        sourceUrl: options.preserveRowProvenance ? asText(properties.source_url) ?? source.url : source.url,
        upstreamOrigin: options.preserveRowProvenance ? asText(properties.upstream_origin) ?? source.upstreamOrigin : source.upstreamOrigin,
        licenseId: options.preserveRowProvenance ? asText(properties.license_id) ?? source.licenseId : source.licenseId,
        attribution: options.preserveRowProvenance ? asText(properties.attribution) ?? source.attribution : source.attribution,
        rawRecordHash: rawHash(item),
      }],
    };

    const parsed = AedRecordSchema.safeParse(proposed);
    if (!parsed.success) {
      rejected += 1;
      issues.push({ code: "invalid_feature", severity: "error", message: "Rekord nie spełnia wzorca AED.", sourceRecordId });
      return;
    }
    records.push(parsed.data);
  });

  return { records, issues, rejected };
}
