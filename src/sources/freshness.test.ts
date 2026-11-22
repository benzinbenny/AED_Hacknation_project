import { describe, expect, it } from "vitest";
import type { SourceReferenceScope } from "../domain/types";
import { assessSourceFreshness } from "./freshness";

const dailyScope: SourceReferenceScope = {
  geographyLabel: "Miasto testowe",
  geographyLevel: "municipality",
  temporalDescription: "Stan publikacji",
  sourceDataDate: "2026-11-20",
  updateFrequency: "Codziennie według metadanych zbioru",
  basis: "publisher_declared",
  limitations: "Test",
};

describe("assessSourceFreshness", () => {
  it("marks a recently collected daily source as fresh", () => {
    const result = assessSourceFreshness(dailyScope, "2026-11-21T08:00:00.000Z", new Date("2026-11-21T12:00:00.000Z"));

    expect(result.status).toBe("fresh");
    expect(result.label).toBe("Pobrano zgodnie z rytmem");
  });

  it("marks an overdue daily source as stale", () => {
    const result = assessSourceFreshness(dailyScope, "2026-11-12T08:00:00.000Z", new Date("2026-11-21T12:00:00.000Z"));

    expect(result.status).toBe("stale");
    expect(result.label).toBe("Wymaga odświeżenia");
  });

  it("does not call a recently fetched daily source fresh when the source data itself is stale", () => {
    const result = assessSourceFreshness(
      { ...dailyScope, sourceDataDate: "2026-11-12" },
      "2026-11-21T08:00:00.000Z",
      new Date("2026-11-21T12:00:00.000Z"),
    );

    expect(result.status).toBe("stale");
    expect(result.label).toBe("Dane źródłowe wymagają odświeżenia");
  });

  it("keeps a one-time publication as a reference rather than claiming it is current", () => {
    const result = assessSourceFreshness({ ...dailyScope, updateFrequency: "Jednorazowe udostępnienie według metadanych" }, null, new Date("2026-11-21T12:00:00.000Z"));

    expect(result.status).toBe("reference");
    expect(result.label).toBe("Źródło referencyjne");
  });

  it("shows that an operational connector has not yet been collected", () => {
    const result = assessSourceFreshness(dailyScope, null, new Date("2026-11-21T12:00:00.000Z"));

    expect(result.status).toBe("not_collected");
    expect(result.label).toBe("Nie pobrano do aplikacji");
  });
});
