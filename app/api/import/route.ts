import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { SourceDescriptor, SourceReferenceScope } from "@/domain/types";
import { importAedCsv, type CsvFieldMapping } from "@/import/csv";
import { importAedGeoJson } from "@/import/geojson";
import { importAedXlsx } from "@/import/xlsx";
import { SourceUninstalled, stageImport } from "@/services/staging";
import { loadAppStore, repository } from "@/storage/repository";

export const runtime = "nodejs";
export const maxDuration = 20;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MetadataSchema = z.object({
  name: z.string().trim().min(2).max(120),
  url: z.string().trim().url(),
  licenseId: z.string().trim().max(120).default("unknown"),
  attribution: z.string().trim().max(300).default(""),
  mapping: z.string().optional(),
  referenceScope: z.string().optional(),
  submissionMethod: z.enum(["manual", "file"]).default("file"),
});

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_BYTES + 32_000) return NextResponse.json({ error: "Maksymalny rozmiar pliku to 5 MB." }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Nie udało się odczytać formularza importu." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Wybierz plik CSV, GeoJSON lub XLSX." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Maksymalny rozmiar pliku to 5 MB." }, { status: 413 });
  const metadata = MetadataSchema.safeParse({
    name: form.get("name"), url: form.get("url"), licenseId: form.get("licenseId") || "unknown",
    attribution: form.get("attribution") || "", mapping: form.get("mapping") || undefined,
    referenceScope: form.get("referenceScope") || undefined, submissionMethod: form.get("submissionMethod") || undefined,
  });
  if (!metadata.success) return NextResponse.json({ error: "Sprawdź nazwę źródła i poprawny adres URL." }, { status: 400 });

  const url = metadata.data.url;
  const sourceId = `upload-${createHash("sha256").update(url).digest("hex").slice(0, 16)}`;
  let referenceScope: SourceReferenceScope | undefined;
  try {
    referenceScope = metadata.data.referenceScope ? z.object({
      geographyLabel: z.string().trim().min(2).max(200),
      geographyLevel: z.enum(["country", "voivodeship", "county", "municipality", "locality", "custom", "unknown"]),
      temporalDescription: z.string().trim().min(2).max(300),
      sourceDataDate: z.string().date().nullable(),
      updateFrequency: z.string().trim().min(2).max(160),
      basis: z.enum(["publisher_declared", "observed_export", "unverified"]),
      limitations: z.string().trim().min(2).max(1000),
    }).parse(JSON.parse(metadata.data.referenceScope)) : undefined;
  } catch {
    return NextResponse.json({ error: "Zakres referencyjny źródła ma nieprawidłowe pola." }, { status: 400 });
  }
  let source: SourceDescriptor = {
    id: sourceId,
    name: metadata.data.name,
    url,
    upstreamOrigin: new URL(url).host,
    licenseId: metadata.data.licenseId || "unknown",
    attribution: metadata.data.attribution,
    ...(referenceScope ? { referenceScope } : {}),
  };
  const fetchedAt = new Date().toISOString();
  const filename = file.name.toLowerCase();
  let result;
  try {
    if (filename.endsWith(".csv")) {
      const text = await file.text();
      let mapping: CsvFieldMapping = { sourceRecordId: "id", name: "name", latitude: "latitude", longitude: "longitude" };
      if (metadata.data.mapping) {
        const parsedMapping: unknown = JSON.parse(metadata.data.mapping);
        mapping = z.object({
          sourceRecordId: z.string().default(""), name: z.string().default(""), latitude: z.string(), longitude: z.string(),
          operatorName: z.string().optional(), address: z.string().optional(), locationDescription: z.string().optional(),
          access: z.string().optional(), accessNotes: z.string().optional(), openingHours: z.string().optional(),
          operationalStatus: z.string().optional(), lastVerifiedAt: z.string().optional(), verificationMethod: z.string().optional(),
          externalReference: z.string().optional(), coordinateAccuracyMeters: z.string().optional(), countryCode: z.string().optional(),
          voivodeship: z.string().optional(), county: z.string().optional(), municipality: z.string().optional(), locality: z.string().optional(),
          postalCode: z.string().optional(), terytTerc: z.string().optional(), terytSimc: z.string().optional(), indoor: z.string().optional(),
          floor: z.string().optional(), entranceDescription: z.string().optional(), timezone: z.string().optional(), availabilityState: z.string().optional(),
          availabilityEvaluatedAt: z.string().optional(), operationalStatusObservedAt: z.string().optional(), verificationActorType: z.string().optional(),
          verificationScope: z.string().optional(), nextVerificationDueAt: z.string().optional(), recordStatus: z.string().optional(), sourceUpdatedAt: z.string().optional(),
        }).parse(parsedMapping);
      }
      if (text.length > MAX_FILE_BYTES) return NextResponse.json({ error: "Maksymalny rozmiar pliku to 5 MB." }, { status: 413 });
      result = importAedCsv(text, source, mapping, fetchedAt);
    } else if (filename.endsWith(".geojson") || filename.endsWith(".json")) {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      result = importAedGeoJson(json, source, fetchedAt);
    } else if (filename.endsWith(".xlsx")) {
      result = await importAedXlsx(Buffer.from(await file.arrayBuffer()), source, fetchedAt);
      source = result.source;
    } else {
      return NextResponse.json({ error: "Obsługiwane formaty to CSV, GeoJSON (.geojson lub .json) i wzorcowy XLSX (.xlsx)." }, { status: 415 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? "Niepoprawny JSON/mapowanie kolumn." : "Plik nie przeszedł walidacji. Sprawdź jego format i nagłówki." }, { status: 400 });
  }

  if (result.records.length === 0) {
    return NextResponse.json({
      runId: null, accepted: 0, skippedDeleted: 0, rejected: result.rejected,
      warningCount: result.issues.filter((issue) => issue.severity === "warning").length,
      issues: result.issues, moderationRequired: true, licenseReviewStatus: null,
    }, { status: 201 });
  }
  await loadAppStore();
  let runId = "";
  let accepted = 0;
  try {
    await repository.update((store) => {
      const records = result.records.map((record) => ({ ...record, submissionMethod: metadata.data.submissionMethod }));
      const restored = { ...store, forgottenSourceIds: (store.forgottenSourceIds ?? []).filter((id) => id !== source.id) };
      const staged = stageImport(restored, source, records, result.issues, fetchedAt);
      runId = staged.run.id;
      accepted = staged.run.importedCount;
      return staged.store;
    });
  } catch (error) {
    if (error instanceof SourceUninstalled) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
  return NextResponse.json({
    runId,
    accepted,
    skippedDeleted: result.records.length - accepted,
    rejected: result.rejected,
    warningCount: result.issues.filter((issue) => issue.severity === "warning").length,
    issues: result.issues,
    moderationRequired: true,
    licenseReviewStatus: "needs_review",
  }, { status: 201 });
}
