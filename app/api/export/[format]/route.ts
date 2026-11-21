import { NextResponse } from "next/server";
import { serializeAedCsv } from "@/export/csv";
import { exportableRecords } from "@/services/licensing";
import { loadAppStore } from "@/storage/repository";

export const runtime = "nodejs";

function attachment(content: string, mime: string, filename: string) {
  return new NextResponse(content, { headers: { "Content-Type": `${mime}; charset=utf-8`, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ format: string }> }) {
  const { format } = await params;
  const store = await loadAppStore();
  const records = exportableRecords(store);
  const generatedAt = new Date().toISOString();
  const payload = { schemaVersion: 1, generatedAt, syntheticIncluded: false, recordCount: records.length, records };

  if (format === "csv") return attachment(serializeAedCsv(records), "text/csv", "punkt-zycia-aed.csv");
  if (format === "json") return attachment(JSON.stringify(payload, null, 2), "application/json", "punkt-zycia-aed.json");
  if (format === "geojson") {
    const geojson = {
      type: "FeatureCollection",
      generatedAt,
      schemaVersion: 1,
      features: records.map((record) => ({
        type: "Feature",
        id: record.id,
        geometry: { type: "Point", coordinates: [record.location.longitude, record.location.latitude] },
        properties: {
          name: record.name, external_reference: record.externalReference ?? null, operator: record.operatorName, address: record.address,
          coordinate_accuracy_m: record.coordinateAccuracyMeters ?? null,
          country_code: record.geography?.countryCode ?? null, voivodeship: record.geography?.voivodeship ?? null,
          county: record.geography?.county ?? null, municipality: record.geography?.municipality ?? null,
          locality: record.geography?.locality ?? null, postal_code: record.geography?.postalCode ?? null,
          teryt_terc: record.geography?.terytTerc ?? null, teryt_simc: record.geography?.terytSimc ?? null,
          location_description: record.locationDescription, indoor: record.placement?.indoor ?? "unknown",
          floor: record.placement?.floor ?? null, entrance_description: record.placement?.entranceDescription ?? null,
          timezone: record.timezone ?? null, access_type: record.accessType,
          access_notes: record.accessNotes, opening_hours_raw: record.availability.rawHours,
          availability_state: record.availability.state, availability_evaluated_at: record.availability.evaluatedAt,
          operational_status: record.operationalStatus, operational_status_observed_at: record.operationalStatusObservedAt ?? null,
          last_verified_at: record.lastVerifiedAt, verification_method: record.verificationMethod,
          verification_actor_type: record.verificationActorType ?? "unknown", verification_scope: record.verificationScope ?? "unknown",
          next_verification_due_at: record.nextVerificationDueAt ?? null,
          record_status: record.recordStatus, sources: record.sources,
        },
      })),
    };
    return attachment(JSON.stringify(geojson, null, 2), "application/geo+json", "punkt-zycia-aed.geojson");
  }
  return NextResponse.json({ error: "Dostępne formaty eksportu: csv, json, geojson." }, { status: 404 });
}
