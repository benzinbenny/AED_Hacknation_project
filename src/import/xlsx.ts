import ExcelJS from "exceljs";
import type { ImportIssue, ImportResult, SourceDescriptor } from "../domain/types";
import { importAedGeoJson } from "./geojson";

type SpreadsheetRow = Record<string, string>;

export type XlsxImportResult = ImportResult & { source: SourceDescriptor };

const propertyMap: Record<string, string> = {
  source_id: "source_id",
  source_record_id: "source_record_id",
  aed_id: "aed_id",
  nazwa: "name",
  external_reference: "external_reference",
  operator: "operator",
  coordinate_accuracy_m: "coordinate_accuracy_m",
  country_code: "country_code",
  voivodeship: "voivodeship",
  county: "county",
  municipality: "municipality",
  locality: "locality",
  postal_code: "postal_code",
  teryt_terc: "teryt_terc",
  teryt_simc: "teryt_simc",
  adres: "addr:full",
  opis_lokalizacji: "location_description",
  indoor: "indoor",
  floor: "floor",
  entrance_description: "entrance_description",
  timezone: "timezone",
  access_type: "access",
  access_notes: "access_notes",
  opening_hours_raw: "opening_hours",
  availability_state: "availability_state",
  availability_evaluated_at: "availability_evaluated_at",
  operational_status: "operational_status",
  operational_status_observed_at: "operational_status_observed_at",
  last_verified_at: "last_verified_at",
  verification_method: "verification_method",
  verification_actor_type: "verification_actor_type",
  verification_scope: "verification_scope",
  next_verification_due_at: "next_verification_due_at",
  record_status: "record_status",
  source_url: "source_url",
  upstream_origin: "upstream_origin",
  fetched_at: "fetched_at",
  source_updated_at: "source_updated_at",
  license_id: "license_id",
  attribution: "attribution",
};

const requiredHeaders = [
  "source_id",
  "source_record_id",
  "latitude",
  "longitude",
  "access_type",
  "operational_status",
  "record_status",
  "fetched_at",
  "license_id",
  "synthetic_demo",
] as const;

const MAX_XLSX_ARCHIVE_ENTRIES = 300;
const MAX_XLSX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_XLSX_EXPANSION_RATIO = 100;

function validateXlsxArchive(buffer: Buffer | Uint8Array): string | null {
  const bytes = Buffer.from(buffer);
  const endOfCentralDirectory = 0x06054b50;
  const centralDirectoryFileHeader = 0x02014b50;
  const searchStart = Math.max(0, bytes.length - 65_557);
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= searchStart; offset -= 1) {
    if (bytes.readUInt32LE(offset) === endOfCentralDirectory) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) return "Plik XLSX nie zawiera poprawnego katalogu ZIP.";

  const entries = bytes.readUInt16LE(endOffset + 10);
  const centralOffset = bytes.readUInt32LE(endOffset + 16);
  if (entries === 0xffff || centralOffset === 0xffffffff) return "Archiwum XLSX używa nieobsługiwanego rozszerzenia ZIP64.";
  if (entries > MAX_XLSX_ARCHIVE_ENTRIES) return "Archiwum XLSX zawiera zbyt wiele plików wewnętrznych.";

  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== centralDirectoryFileHeader) return "Plik XLSX ma uszkodzony katalog ZIP.";
    const compressed = bytes.readUInt32LE(offset + 20);
    const uncompressed = bytes.readUInt32LE(offset + 24);
    const fileNameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    if (compressed === 0xffffffff || uncompressed === 0xffffffff) return "Archiwum XLSX używa nieobsługiwanego rozszerzenia ZIP64.";
    totalUncompressed += uncompressed;
    if (totalUncompressed > MAX_XLSX_UNCOMPRESSED_BYTES || (compressed > 0 && uncompressed / compressed > MAX_XLSX_EXPANSION_RATIO)) {
      return "Arkusz XLSX przekracza bezpieczny limit rozmiaru po rozpakowaniu.";
    }
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return null;
}

function cellText(cell: ExcelJS.Cell): string {
  if (cell.value && typeof cell.value === "object" && "formula" in cell.value) return "";
  return cell.text.trim();
}

function readRows(sheet: ExcelJS.Worksheet): { headers: string[]; rows: SpreadsheetRow[] } {
  const headers: string[] = [];
  const headerRow = sheet.getRow(1);
  for (let column = 1; column <= headerRow.cellCount; column += 1) {
    headers.push(cellText(headerRow.getCell(column)).toLocaleLowerCase("pl-PL").trim());
  }

  const rows: SpreadsheetRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: SpreadsheetRow = {};
    headers.forEach((header, index) => {
      if (header) values[header] = cellText(row.getCell(index + 1));
    });
    if (Object.values(values).some(Boolean)) rows.push(values);
  });
  return { headers, rows };
}

function issue(message: string, sourceRecordId: string | null): ImportIssue {
  return { code: "invalid_feature", severity: "error", message, sourceRecordId };
}

function errorResult(source: SourceDescriptor, message: string, sourceRecordId: string | null = null): XlsxImportResult {
  return { source, records: [], rejected: 1, issues: [issue(message, sourceRecordId)] };
}

function value(row: SpreadsheetRow, key: string): string | null {
  const candidate = row[key]?.trim();
  return candidate ? candidate : null;
}

function sourceRecordId(row: SpreadsheetRow): string | null {
  return value(row, "source_record_id") ?? value(row, "aed_id");
}

function isSynthetic(row: SpreadsheetRow): boolean {
  return ["true", "tak", "yes", "1"].includes(value(row, "synthetic_demo")?.toLocaleLowerCase("pl-PL") ?? "");
}

function isDeclaredNonSynthetic(row: SpreadsheetRow): boolean {
  return ["false", "nie", "no", "0"].includes(value(row, "synthetic_demo")?.toLocaleLowerCase("pl-PL") ?? "");
}

function missingRequiredValues(row: SpreadsheetRow): string[] {
  return requiredHeaders.filter((header) => !value(row, header));
}

function asFeature(row: SpreadsheetRow, sourceRow: number) {
  const properties: Record<string, string> = { import_row: String(sourceRow) };
  for (const [header, property] of Object.entries(propertyMap)) {
    const cell = value(row, header);
    if (cell) properties[property] = cell;
  }
  const id = sourceRecordId(row);
  if (id) properties.source_record_id = id;

  return {
    type: "Feature" as const,
    id: id ?? undefined,
    geometry: {
      type: "Point" as const,
      coordinates: [Number(value(row, "longitude")), Number(value(row, "latitude"))],
    },
    properties,
  };
}

function singleValue(rows: SpreadsheetRow[], key: string): { value: string | null; conflict: boolean } {
  const values = new Set(rows.map((row) => value(row, key)).filter((candidate): candidate is string => candidate !== null));
  if (values.size > 1) return { value: null, conflict: true };
  return { value: values.values().next().value ?? null, conflict: false };
}

function normalizedUrl(value: string): string | null {
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}

function resolveSource(source: SourceDescriptor, rows: SpreadsheetRow[]): { source: SourceDescriptor; error: string | null } {
  const fields = ["source_id", "source_url", "upstream_origin", "license_id", "attribution"] as const;
  const values = Object.fromEntries(fields.map((field) => [field, singleValue(rows, field)])) as Record<(typeof fields)[number], { value: string | null; conflict: boolean }>;
  const conflictedField = fields.find((field) => values[field].conflict);
  if (conflictedField) return { source, error: `Arkusz zawiera różne wartości pola ${conflictedField}. Jeden plik XLSX musi opisywać jeden dysponent i jedno źródło.` };

  const canonicalUrl = values.source_url.value;
  if (canonicalUrl && (!normalizedUrl(canonicalUrl) || normalizedUrl(canonicalUrl) !== normalizedUrl(source.url))) {
    return { source, error: "Wartość source_url w arkuszu nie zgadza się z adresem źródłowym podanym przy przekazaniu pliku." };
  }

  const canonicalLicense = values.license_id.value;
  if (canonicalLicense && source.licenseId !== "unknown" && source.licenseId !== canonicalLicense) {
    return { source, error: "Wartość license_id w arkuszu nie zgadza się z licencją podaną przy przekazaniu pliku." };
  }

  const canonicalAttribution = values.attribution.value;
  if (canonicalAttribution && source.attribution && source.attribution !== canonicalAttribution) {
    return { source, error: "Wartość attribution w arkuszu nie zgadza się z oznaczeniem podanym przy przekazaniu pliku." };
  }

  return {
    source: {
      ...source,
      upstreamOrigin: values.upstream_origin.value ?? source.upstreamOrigin,
      licenseId: canonicalLicense ?? source.licenseId,
      attribution: canonicalAttribution ?? source.attribution,
    },
    error: null,
  };
}

export async function importAedXlsx(
  buffer: Buffer | Uint8Array,
  source: SourceDescriptor,
  fetchedAt: string,
): Promise<XlsxImportResult> {
  const archiveError = validateXlsxArchive(buffer);
  if (archiveError) return errorResult(source, archiveError);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as never);
  } catch {
    return errorResult(source, "Plik XLSX jest uszkodzony albo nie można go odczytać.");
  }

  const sheet = workbook.getWorksheet("Dane_AED");
  if (!sheet) return errorResult(source, "Plik XLSX musi zawierać arkusz Dane_AED ze wzorcowego standardu.");

  const { headers, rows } = readRows(sheet);
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) return errorResult(source, `Arkusz Dane_AED nie zawiera wymaganych nagłówków: ${missingHeaders.join(", ")}.`);

  const issues: ImportIssue[] = [];
  const validRows: SpreadsheetRow[] = [];
  rows.forEach((row) => {
    const rowId = sourceRecordId(row);
    const missing = missingRequiredValues(row);
    if (missing.length > 0) {
      issues.push(issue(`Brakuje wymaganych wartości: ${missing.join(", ")}.`, rowId));
      return;
    }
    if (isSynthetic(row)) {
      issues.push(issue("Rekord oznaczony jako syntetyczny nie może trafić do kolejki publikacyjnej.", rowId));
      return;
    }
    if (!isDeclaredNonSynthetic(row)) {
      issues.push(issue("Pole synthetic_demo musi mieć wartość false dla danych przekazywanych do publikacji.", rowId));
      return;
    }
    validRows.push(row);
  });

  const resolved = resolveSource(source, validRows);
  if (resolved.error) {
    return {
      source,
      records: [],
      rejected: issues.length + Math.max(validRows.length, 1),
      issues: [...issues, issue(resolved.error, null)],
    };
  }

  const features = validRows.map((row) => asFeature(row, rows.indexOf(row) + 2));
  const imported = importAedGeoJson({ type: "FeatureCollection", features }, resolved.source, fetchedAt, { preserveRowProvenance: true });
  return {
    source: resolved.source,
    records: imported.records,
    rejected: imported.rejected + issues.length,
    issues: [...imported.issues, ...issues],
  };
}
