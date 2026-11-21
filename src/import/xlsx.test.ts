import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { SourceDescriptor } from "../domain/types";
import { importAedXlsx } from "./xlsx";

const source: SourceDescriptor = {
  id: "xlsx-dysponent",
  name: "Rejestr AED dysponenta",
  url: "https://example.invalid/aed.xlsx",
  upstreamOrigin: "Dysponent testowy",
  licenseId: "CC BY 4.0",
  attribution: "Dysponent testowy",
};

async function workbookBuffer(sheetName: string, headers: string[] = [], row: Record<string, string | number> = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  if (headers.length > 0) {
    sheet.addRow(headers);
    sheet.addRow(headers.map((header) => row[header] ?? ""));
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("importAedXlsx", () => {
  it("imports a canonical Dane_AED row through the same validation path as other formats", async () => {
    const buffer = await workbookBuffer("Dane_AED", ["source_record_id", "nazwa", "latitude", "longitude", "access_type", "operational_status", "teryt_terc"], {
      source_record_id: "warszawa-42",
      nazwa: "AED przy wejściu",
      latitude: 52.2297,
      longitude: 21.0122,
      access_type: "public",
      operational_status: "unknown",
      teryt_terc: "1465011",
    });

    const result = await importAedXlsx(buffer, source, "2026-11-21T12:00:00.000Z");

    expect(result.records).toHaveLength(1);
    expect(result.records[0].name).toBe("AED przy wejściu");
    expect(result.records[0].location).toEqual({ latitude: 52.2297, longitude: 21.0122 });
    expect(result.records[0].accessType).toBe("public");
    expect(result.records[0].geography?.terytTerc).toBe("1465011");
    expect(result.records[0].sources[0]).toMatchObject({ sourceId: "xlsx-dysponent", sourceRecordId: "warszawa-42", licenseId: "CC BY 4.0" });
  });

  it("returns a controlled import issue when the canonical worksheet is missing", async () => {
    const buffer = await workbookBuffer("Inny_arkusz");

    const result = await importAedXlsx(buffer, source, "2026-11-21T12:00:00.000Z");

    expect(result.records).toHaveLength(0);
    expect(result.rejected).toBe(1);
    expect(result.issues[0]).toMatchObject({ code: "invalid_feature", severity: "error" });
    expect(result.issues[0].message).toContain("Dane_AED");
  });
});
