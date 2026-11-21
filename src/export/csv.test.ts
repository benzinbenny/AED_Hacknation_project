import { describe, expect, it } from "vitest";
import { serializeAedCsv } from "./csv";
import type { AedRecord } from "../domain/types";

const record: AedRecord = {
  id: "aed-1",
  name: "=HYPERLINK(\"https://example.invalid\",\"AED\")",
  operatorName: null,
  location: { latitude: 52.23, longitude: 21.01 },
  address: null,
  locationDescription: null,
  accessType: "unknown",
  accessNotes: null,
  availability: { rawHours: null, state: "unknown", evaluatedAt: null },
  operationalStatus: "unknown",
  lastVerifiedAt: null,
  verificationMethod: null,
  recordStatus: "active",
  sources: [{ sourceId: "source-a", sourceRecordId: "row-1", fetchedAt: "2026-11-21T10:00:00.000Z" }],
};

describe("serializeAedCsv", () => {
  it("neutralizes formula-like untrusted values for spreadsheet consumers", () => {
    const csv = serializeAedCsv([record]);

    expect(csv).toContain("'=HYPERLINK");
  });

  it("exports UTF-8 compatible headers and leaves unknown values empty", () => {
    const csv = serializeAedCsv([record]);

    expect(csv.split("\n")[0]).toContain("coordinate_accuracy_m");
    expect(csv.split("\n")[0]).toContain("teryt_terc");
    expect(csv.split("\n")[1]).toContain("unknown");
  });

  it("keeps negative numeric coordinates numeric", () => {
    const csv = serializeAedCsv([{ ...record, location: { latitude: -12.5, longitude: -45.25 } }]);

    expect(csv.split("\r\n")[1]).toContain(",-12.5,-45.25,");
  });
});
