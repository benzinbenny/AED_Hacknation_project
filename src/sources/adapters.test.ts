import { describe, expect, it } from "vitest";
import { normalizeSourcePayload } from "./adapters";

const fetchedAt = "2026-11-21T12:00:00.000Z";

describe("normalizeSourcePayload", () => {
  it("preserves quoted Marki CSV fields, escaped quotes and embedded newlines after a BOM", () => {
    const csv = [
      '\uFEFF"Długość geograficzna","Szerokość geograficzna","Nazwa","Lokalizacja","Adres","Numer Id"',
      '"52.326697","21.107557","AED ""A""","Urząd","Piłsudskiego 95,\r\nMarki","1"',
      '"21.720344","49.718809","Defibrylator","Szkoła","ul. Przykładowa 1, Marki","7"',
    ].join("\r\n");

    const result = normalizeSourcePayload("dane-gov-marki", csv, fetchedAt);

    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({ name: 'AED "A"', address: "Piłsudskiego 95,\r\nMarki", location: { latitude: 52.326697, longitude: 21.107557 } });
    expect(result.records[1]).toMatchObject({ location: { latitude: 21.720344, longitude: 49.718809 } });
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "outside_poland", severity: "warning", sourceRecordId: "7" }));
  });

  it("maps Krosno's longitude-first CSV by its own headers", () => {
    const csv = [
      "Długość geograficzna,Szerokość geograficzna, Nazwa, Lokalizacja, Adres, Numer Id",
      '21.720344,49.718809,"Defibrylator","Basen","ul. Jasna, Krosno","1"',
    ].join("\n");

    const result = normalizeSourcePayload("dane-gov-krosno", csv, fetchedAt);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      location: { latitude: 49.718809, longitude: 21.720344 },
      name: "Defibrylator",
      operatorName: "Basen",
      address: "ul. Jasna, Krosno",
    });
  });

  it("maps Warsaw's documented nested point response and keeps reported status unknown", () => {
    const result = normalizeSourcePayload("warszawa-scb-aed", [{
      geometry: { type: "Point", coordinates: [[21.0148748892902, 52.2086170695684]] },
      properties: {
        defibrillator_id: "622",
        device_access_description: "Poniedziałek 8:00-18:00",
        device_public_access: "Publiczny",
        device_location: "Wewnątrz budynku",
        location_building: "25/27",
        location_city: "Warszawa",
        location_description: "Przy wejściu na półpiętrze.",
        location_object_name: "Urząd Dzielnicy Mokotów",
        location_postcode: "02-517",
        location_street: "Rakowiecka",
      },
    }], fetchedAt);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      location: { latitude: 52.2086170695684, longitude: 21.0148748892902 },
      accessType: "public",
      operationalStatus: "unknown",
      availability: { rawHours: "Poniedziałek 8:00-18:00", state: "unknown" },
      address: "Rakowiecka 25/27, 02-517 Warszawa",
    });
  });
});
