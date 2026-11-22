import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { SourceDescriptor } from "../domain/types";
import { importAedXlsx } from "./xlsx";

const source: SourceDescriptor = {
  id: "xlsx-dysponent",
  name: "Rejestr AED dysponenta",
  url: "https://example.invalid/aed.xlsx",
  upstreamOrigin: "Dysponent testowy",
  licenseId: "unknown",
  attribution: "",
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

function withOversizedZipEntry(buffer: Buffer): Buffer {
  const altered = Buffer.from(buffer);
  const centralDirectoryHeader = altered.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  if (centralDirectoryHeader < 0) throw new Error("Test workbook has no central ZIP directory.");
  altered.writeUInt32LE(32 * 1024 * 1024, centralDirectoryHeader + 24);
  return altered;
}

describe("importAedXlsx", () => {
  it("imports a canonical Dane_AED row through the same validation path as other formats", async () => {
    const buffer = await workbookBuffer("Dane_AED", ["source_id", "source_record_id", "nazwa", "latitude", "longitude", "access_type", "operational_status", "record_status", "fetched_at", "license_id", "attribution", "source_url", "upstream_origin", "synthetic_demo", "teryt_terc"], {
      source_id: "miejski-rejestr-aed",
      source_record_id: "warszawa-42",
      nazwa: "AED przy wejściu",
      latitude: 52.2297,
      longitude: 21.0122,
      access_type: "public",
      operational_status: "unknown",
      record_status: "active",
      fetched_at: "2026-11-20T12:00:00.000Z",
      license_id: "CC BY 4.0",
      attribution: "Miasto testowe",
      source_url: "https://example.invalid/aed.xlsx",
      upstream_origin: "Miejski rejestr AED",
      synthetic_demo: "false",
      teryt_terc: "1465011",
    });

    const result = await importAedXlsx(buffer, source, "2026-11-21T12:00:00.000Z");

    expect(result.records).toHaveLength(1);
    expect(result.records[0].name).toBe("AED przy wejściu");
    expect(result.records[0].location).toEqual({ latitude: 52.2297, longitude: 21.0122 });
    expect(result.records[0].accessType).toBe("public");
    expect(result.records[0].geography?.terytTerc).toBe("1465011");
    expect(result.records[0].sources[0]).toMatchObject({
      sourceId: "xlsx-dysponent",
      upstreamSourceId: "miejski-rejestr-aed",
      sourceRecordId: "warszawa-42",
      sourceUrl: "https://example.invalid/aed.xlsx",
      upstreamOrigin: "Miejski rejestr AED",
      fetchedAt: "2026-11-20T12:00:00.000Z",
      licenseId: "CC BY 4.0",
      attribution: "Miasto testowe",
    });
    expect(result.source).toMatchObject({ licenseId: "CC BY 4.0", attribution: "Miasto testowe", upstreamOrigin: "Miejski rejestr AED" });
  });

  it("rejects an XLSX row with blank mandatory coordinates instead of importing 0,0", async () => {
    const buffer = await workbookBuffer("Dane_AED", ["source_id", "source_record_id", "latitude", "longitude", "access_type", "operational_status", "record_status", "fetched_at", "license_id", "synthetic_demo"], {
      source_id: "miejski-rejestr-aed",
      source_record_id: "missing-coordinates",
      access_type: "unknown",
      operational_status: "unknown",
      record_status: "active",
      fetched_at: "2026-11-20T12:00:00.000Z",
      license_id: "CC BY 4.0",
      synthetic_demo: "false",
    });

    const result = await importAedXlsx(buffer, source, "2026-11-21T12:00:00.000Z");

    expect(result.records).toHaveLength(0);
    expect(result.rejected).toBe(1);
    expect(result.issues[0]?.message).toContain("latitude");
  });

  it("rejects a conflicting source URL instead of silently replacing upload metadata", async () => {
    const buffer = await workbookBuffer("Dane_AED", ["source_id", "source_record_id", "latitude", "longitude", "access_type", "operational_status", "record_status", "fetched_at", "license_id", "source_url", "synthetic_demo"], {
      source_id: "miejski-rejestr-aed",
      source_record_id: "conflicting-url",
      latitude: 52.2297,
      longitude: 21.0122,
      access_type: "public",
      operational_status: "unknown",
      record_status: "active",
      fetched_at: "2026-11-20T12:00:00.000Z",
      license_id: "CC BY 4.0",
      source_url: "https://other.example.invalid/aed.xlsx",
      synthetic_demo: "false",
    });

    const result = await importAedXlsx(buffer, source, "2026-11-21T12:00:00.000Z");

    expect(result.records).toHaveLength(0);
    expect(result.issues[0]?.message).toContain("source_url");
  });

  it("rejects a compressed XLSX whose declared decompressed archive is too large", async () => {
    const buffer = withOversizedZipEntry(await workbookBuffer("Dane_AED", ["source_id"]));

    const result = await importAedXlsx(buffer, source, "2026-11-21T12:00:00.000Z");

    expect(result.records).toHaveLength(0);
    expect(result.issues[0]?.message).toContain("po rozpakowaniu");
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
