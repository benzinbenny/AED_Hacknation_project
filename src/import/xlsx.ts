import ExcelJS from "exceljs";
import type { ImportIssue, ImportResult, SourceDescriptor } from "../domain/types";
import { importAedGeoJson } from "./geojson";

type SpreadsheetRow = Record<string, string>;

const propertyMap: Record<string, string> = {
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
  source_updated_at: "source_updated_at",
};

function cellText(cell: ExcelJS.Cell): string {
  if (cell.value && typeof cell.value === "object" && "formula" in cell.value) return "";
  return cell.text.trim();
}

function readRows(sheet: ExcelJS.Worksheet): SpreadsheetRow[] {
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
  return rows;
}

function asFeature(row: SpreadsheetRow, sourceRow: number) {
  const properties: Record<string, string> = { import_row: String(sourceRow) };
  for (const [header, property] of Object.entries(propertyMap)) {
    const value = row[header];
    if (value) properties[property] = value;
  }
  const sourceRecordId = properties.source_record_id || properties.aed_id;
  if (sourceRecordId) properties.source_record_id = sourceRecordId;

  return {
    type: "Feature" as const,
    id: sourceRecordId ?? undefined,
    geometry: {
      type: "Point" as const,
      coordinates: [Number(row.longitude), Number(row.latitude)],
    },
    properties,
  };
}

function isSynthetic(row: SpreadsheetRow): boolean {
  return ["true", "tak", "yes", "1"].includes(row.synthetic_demo?.toLocaleLowerCase("pl-PL").trim() ?? "");
}

export async function importAedXlsx(
  buffer: Buffer | Uint8Array,
  source: SourceDescriptor,
  fetchedAt: string,
): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as never);
  } catch {
    return {
      records: [],
      rejected: 1,
      issues: [{ code: "invalid_feature", severity: "error", message: "Plik XLSX jest uszkodzony albo nie można go odczytać.", sourceRecordId: null }],
    };
  }

  const sheet = workbook.getWorksheet("Dane_AED");
  if (!sheet) {
    return {
      records: [],
      rejected: 1,
      issues: [{ code: "invalid_feature", severity: "error", message: "Plik XLSX musi zawierać arkusz Dane_AED ze wzorcowego standardu.", sourceRecordId: null }],
    };
  }

  const rows = readRows(sheet);
  const issues: ImportIssue[] = [];
  const features = rows.flatMap((row, index) => {
    if (!isSynthetic(row)) return [asFeature(row, index + 2)];
    issues.push({
      code: "invalid_feature",
      severity: "error",
      message: "Rekord oznaczony jako syntetyczny nie może trafić do kolejki publikacyjnej.",
      sourceRecordId: row.source_record_id || row.aed_id || null,
    });
    return [];
  });
  const imported = importAedGeoJson({ type: "FeatureCollection", features }, source, fetchedAt);
  return {
    records: imported.records,
    rejected: imported.rejected + issues.length,
    issues: [...imported.issues, ...issues],
  };
}
