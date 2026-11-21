import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createStandardWorkbook } from "./workbook";

describe("AED data standard workbook", () => {
  it("includes operational, verification, TERYT, and source-scope fields", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(await createStandardWorkbook()) as never);
    const dataHeaders = workbook.getWorksheet("Dane_AED")!.getRow(1).values as string[];
    const sourceSheet = workbook.getWorksheet("Zrodla")!;
    const sourceHeaders = sourceSheet.getRow(1).values as string[];

    expect(workbook.getWorksheet("Instrukcja")!.getCell("B1").text).toContain("wersja 0.2");

    for (const field of ["coordinate_accuracy_m", "teryt_terc", "teryt_simc", "indoor", "timezone", "verification_scope", "next_verification_due_at"]) {
      expect(dataHeaders).toContain(field);
    }
    for (const field of ["reference_geography", "reference_data_date", "reference_update_frequency", "reference_basis", "reference_limitations"]) {
      expect(sourceHeaders).toContain(field);
    }
    expect(sourceSheet.rowCount).toBeGreaterThan(5);
  });
});
