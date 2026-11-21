import ExcelJS from "exceljs";
import { AED_SOURCE_CATALOG } from "../sources/catalog";

const columns = [
  ["aed_id", "Stabilny identyfikator AED w tym zbiorze", "UUID", "Nie"],
  ["nazwa", "Nazwa miejsca lub punktu", "tekst", "Nie"],
  ["external_reference", "Identyfikator lub odnośnik zewnętrzny dysponenta", "tekst / URL", "Nie"],
  ["operator", "Podmiot zarządzający urządzeniem", "tekst", "Nie"],
  ["latitude", "Szerokość geograficzna WGS84", "liczba -90..90", "Tak"],
  ["longitude", "Długość geograficzna WGS84", "liczba -180..180", "Tak"],
  ["coordinate_accuracy_m", "Szacowana dokładność współrzędnych", "liczba >= 0; metry", "Nie"],
  ["country_code", "Kod kraju ISO 3166-1 alpha-2", "tekst; np. PL", "Nie"],
  ["voivodeship", "Województwo", "tekst", "Nie"],
  ["county", "Powiat", "tekst", "Nie"],
  ["municipality", "Gmina lub miasto", "tekst", "Nie"],
  ["locality", "Miejscowość", "tekst", "Nie"],
  ["postal_code", "Kod pocztowy", "tekst", "Nie"],
  ["teryt_terc", "Kod jednostki podziału terytorialnego", "TERYT TERC; tekst zachowujący zera wiodące", "Nie"],
  ["teryt_simc", "Kod miejscowości", "TERYT SIMC; tekst zachowujący zera wiodące", "Nie"],
  ["adres", "Adres zapisany przez źródło", "tekst", "Nie"],
  ["opis_lokalizacji", "Opis dojścia lub miejsca", "tekst", "Nie"],
  ["indoor", "Lokalizacja wewnątrz / na zewnątrz", "tak / nie / unknown", "Tak; unknown dozwolone"],
  ["floor", "Piętro lub poziom", "tekst", "Nie"],
  ["entrance_description", "Opis wejścia i dojścia", "tekst", "Nie"],
  ["timezone", "Strefa czasowa interpretacji harmonogramu", "IANA; np. Europe/Warsaw", "Nie"],
  ["access_type", "Typ dostępu do lokalizacji", "słownik", "Tak; unknown dozwolone"],
  ["access_notes", "Warunki dostępu", "tekst", "Nie"],
  ["opening_hours_raw", "Godziny w oryginalnej postaci", "tekst źródłowy", "Nie"],
  ["availability_state", "Dostępność według harmonogramu", "słownik", "Tak; unknown dozwolone"],
  ["availability_evaluated_at", "Czas interpretacji harmonogramu", "data ISO 8601", "Nie"],
  ["operational_status", "Zgłoszony stan urządzenia", "słownik", "Tak; unknown dozwolone"],
  ["operational_status_observed_at", "Czas obserwacji zgłoszonego stanu", "data ISO 8601", "Nie"],
  ["last_verified_at", "Data ostatniego potwierdzenia stanu", "data ISO 8601", "Nie"],
  ["verification_method", "Metoda i autor weryfikacji", "tekst", "Nie"],
  ["verification_actor_type", "Rodzaj podmiotu weryfikującego", "słownik", "Tak; unknown dozwolone"],
  ["verification_scope", "Zakres faktycznej weryfikacji", "słownik", "Tak; unknown dozwolone"],
  ["next_verification_due_at", "Termin ponownej weryfikacji", "data ISO 8601", "Nie"],
  ["record_status", "Status wpisu w zbiorze", "słownik", "Tak"],
  ["source_id", "Identyfikator zarejestrowanego źródła", "tekst", "Tak"],
  ["source_record_id", "Identyfikator rekordu w źródle", "tekst", "Tak"],
  ["source_url", "Adres źródła", "URL", "Nie"],
  ["upstream_origin", "Pierwotny dostawca danych", "tekst", "Nie"],
  ["fetched_at", "Czas pozyskania przez Punkt Życia", "data ISO 8601", "Tak"],
  ["source_updated_at", "Czas aktualizacji u źródła", "data ISO 8601", "Nie"],
  ["license_id", "Identyfikator licencji", "tekst; unknown blokuje publikację", "Tak"],
  ["attribution", "Wymagane oznaczenie źródła", "tekst", "Nie"],
  ["synthetic_demo", "Czy dane są fikcyjnym przykładem", "true / false", "Tak"],
] as const;

const allowedValues = {
  access_type: ["public", "customers", "restricted", "private", "unknown"],
  availability_state: ["open_by_schedule", "closed_by_schedule", "unknown"],
  operational_status: ["reported_operational", "reported_out_of_service", "unknown"],
  record_status: ["active", "temporarily_removed", "removed", "unknown"],
  indoor: ["yes", "no", "unknown"],
  verification_actor_type: ["publisher", "field_community", "automated_import", "unknown"],
  verification_scope: ["location", "access", "operational_status", "full", "unknown"],
} as const;

function styleHeader(sheet: ExcelJS.Worksheet, lastColumn: number) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: lastColumn } };
  const row = sheet.getRow(1);
  row.height = 32;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF075D58" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

export async function createStandardWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Punkt Życia";
  workbook.subject = "Standard wymiany danych o AED";
  workbook.title = "Standard danych AED — Punkt Życia";
  workbook.created = new Date();

  const guide = workbook.addWorksheet("Instrukcja");
  guide.columns = [{ width: 29 }, { width: 95 }];
  guide.addRows([
    ["STANDARD DANYCH AED", "Punkt Życia · wersja 0.2"],
    ["Do czego służy", "Szablon wymiany i przygotowania danych AED. Arkusz Dane_AED zawiera nagłówki oraz walidacje słownikowe."],
    ["Współrzędne", "WGS84. latitude = szerokość geograficzna, longitude = długość geograficzna. GeoJSON zawsze zapisuje kolejność [longitude, latitude]. Nie zamieniaj wartości automatycznie."],
    ["Jednolity zakres", "Uzupełniaj TERYT TERC/SIMC, adres, kod pocztowy, opis wejścia i położenie wewnątrz/na zewnątrz, jeśli dysponent je posiada. Kody TERYT zapisuj jako tekst, aby zachować zera wiodące."],
    ["Wartości nieznane", "Jeśli źródło nie podaje informacji, wpisz unknown. Nie wywnioskuj dostępności z godzin otwarcia ani sprawności z daty importu."],
    ["Dostęp i harmonogram", "access_type opisuje zasady wejścia do obiektu. opening_hours_raw zachowuje zapis źródłowy. availability_state jest wyłącznie interpretacją harmonogramu."],
    ["Stan urządzenia", "operational_status jest zgłoszeniem, a nie gwarancją. last_verified_at i verification_method powinny wskazywać ostatnie rzeczywiste potwierdzenie."],
    ["Zakres weryfikacji", "Wskaż, czy i kiedy sprawdzono lokalizację, dostęp, stan techniczny czy pełny zakres. Import nie jest weryfikacją. Termin następnej kontroli służy planowaniu, nie potwierdza sprawności."],
    ["Zakres źródła", "W zakładce Zrodla zakres geograficzny, czasowy, deklarowana częstotliwość i ograniczenia opisują publikację dysponenta; nie dowodzą kompletności ani aktualności każdego AED."],
    ["Pochodzenie", "Wypełnij source_id, source_record_id, fetched_at i license_id. Zachowaj źródłowy identyfikator i wymagane oznaczenie."],
    ["Licencja", "Nie publikuj danych z licencją unknown. Sprawdź prawa do ponownego wykorzystania i wymagania atrybucji u dysponenta."],
    ["Duplikaty", "Podobne współrzędne są kandydatami do ręcznej analizy. Nie scalaj automatycznie; dwa urządzenia mogą znajdować się w tym samym budynku."],
    ["Dane przykładowe", "Zakładka Przyklady_bledow zawiera fikcyjne przykłady. Są wyłącznie dydaktyczne i nie wolno traktować ich jako rzeczywistych lokalizacji."],
    ["Publikacja", "Szablon nie publikuje danych do dane.gov.pl. Publikację wykonuje uprawniony podmiot przy użyciu własnego konta i wymaganej procedury."],
  ]);
  guide.getRow(1).font = { bold: true, size: 15, color: { argb: "FF075D58" } };
  guide.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 30 : 42;
    row.alignment = { vertical: "top", wrapText: true };
    if (rowNumber > 1) row.getCell(1).font = { bold: true, color: { argb: "FF153A3A" } };
  });

  const data = workbook.addWorksheet("Dane_AED");
  data.columns = columns.map(([name]) => ({ header: name, key: name, width: name.includes("url") || name.includes("origin") || name.includes("attribution") || name.includes("description") ? 30 : name.includes("status") || name.includes("hours") || name.includes("teryt") ? 23 : 19 }));
  styleHeader(data, columns.length);
  data.views = [{ state: "frozen", ySplit: 1, xSplit: 3 }];
  data.getCell("A1").note = "Dodaj po jednym AED w wierszu. Dane fikcyjne umieszczaj wyłącznie w arkuszu Przyklady_bledow.";
  for (let row = 2; row <= 501; row++) {
    for (const [field, values] of Object.entries(allowedValues)) {
      const column = columns.findIndex(([name]) => name === field) + 1;
      data.getCell(row, column).dataValidation = { type: "list", allowBlank: true, formulae: [`"${values.join(",")}"`], showErrorMessage: true, errorTitle: "Nieznana wartość", error: "Wybierz wartość ze słownika." };
    }
    const syntheticColumn = columns.findIndex(([name]) => name === "synthetic_demo") + 1;
    data.getCell(row, syntheticColumn).dataValidation = { type: "list", allowBlank: true, formulae: ['"true,false"'], showErrorMessage: true, error: "Wybierz true albo false." };
  }

  const fields = workbook.addWorksheet("Slownik_pol");
  fields.columns = [{ header: "Nazwa pola", key: "name", width: 28 }, { header: "Opis", key: "description", width: 55 }, { header: "Format / zakres", key: "format", width: 32 }, { header: "Wymagalność", key: "required", width: 28 }];
  fields.addRows(columns.map(([name, description, format, required]) => [name, description, format, required]));
  styleHeader(fields, 4);
  fields.eachRow((row, rowNumber) => { if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true }; });

  const values = workbook.addWorksheet("Slowniki_wartosci");
  values.columns = [{ header: "Pole", key: "field", width: 26 }, { header: "Wartość", key: "value", width: 28 }, { header: "Opis", key: "description", width: 78 }];
  const descriptions: Record<string, string> = {
    public: "Dostęp publiczny", customers: "Dostęp dla klientów lub użytkowników obiektu", restricted: "Dostęp ograniczony", private: "Dostęp prywatny", unknown: "Źródło nie podaje wartości",
    open_by_schedule: "Według harmonogramu lokalizacja powinna być dostępna", closed_by_schedule: "Według harmonogramu lokalizacja powinna być zamknięta",
    reported_operational: "Stan zgłoszony jako sprawny", reported_out_of_service: "Zgłoszono niedostępność lub awarię", active: "Wpis aktywny w zbiorze", temporarily_removed: "Wpis czasowo wycofany", removed: "Wpis usunięty z bieżącego zbioru",
    yes: "Lokalizacja wewnątrz budynku", no: "Lokalizacja na zewnątrz", publisher: "Weryfikacja przez dysponenta danych",
    field_community: "Weryfikacja terenowa przez społeczność", automated_import: "Import automatyczny bez potwierdzenia terenowego",
    location: "Sprawdzono położenie", access: "Sprawdzono możliwość dostępu", operational_status: "Sprawdzono zgłoszony stan AED",
    full: "Sprawdzono położenie, dostęp i stan", country: "Zasięg krajowy", voivodeship: "Zasięg województwa", county: "Zasięg powiatu",
    municipality: "Zasięg gminy lub miasta", locality: "Zasięg miejscowości", custom: "Zasięg inny lub mieszany",
    publisher_declared: "Zakres zadeklarowany przez dysponenta", observed_export: "Zakres zaobserwowany w pobranym eksporcie", unverified: "Zakres niezweryfikowany",
  };
  const valueRows: string[][] = [];
  for (const [field, options] of Object.entries(allowedValues)) for (const value of options) valueRows.push([field, value, descriptions[value] ?? ""]);
  for (const [field, options] of Object.entries({ reference_basis: ["publisher_declared", "observed_export", "unverified"], reference_geography_level: ["country", "voivodeship", "county", "municipality", "locality", "custom", "unknown"] })) {
    for (const value of options) valueRows.push([field, value, descriptions[value] ?? ""]);
  }
  values.addRows(valueRows); styleHeader(values, 3);

  const sources = workbook.addWorksheet("Zrodla");
  sources.columns = [
    { header: "source_id", key: "source_id", width: 24 }, { header: "Nazwa dysponenta", key: "name", width: 30 },
    { header: "URL", key: "url", width: 42 }, { header: "Pierwotne źródło", key: "origin", width: 28 },
    { header: "Licencja", key: "license", width: 22 }, { header: "Atrybucja", key: "attribution", width: 42 },
    { header: "reference_geography", key: "geography", width: 30 }, { header: "Poziom zasięgu", key: "level", width: 20 },
    { header: "reference_temporal_description", key: "temporal", width: 54 }, { header: "reference_data_date", key: "data_date", width: 20 },
    { header: "reference_update_frequency", key: "frequency", width: 38 }, { header: "reference_basis", key: "basis", width: 22 },
    { header: "reference_limitations", key: "limitations", width: 60 }, { header: "Data pobrania", key: "fetched", width: 28 },
    { header: "Status przeglądu", key: "review", width: 22 },
  ];
  styleHeader(sources, 15);
  sources.addRows(AED_SOURCE_CATALOG.map((source) => [
    source.id, source.publisher, source.catalogUrl, source.upstreamOrigin, source.licenseId, source.attribution,
    source.referenceScope.geographyLabel, source.referenceScope.geographyLevel,
    source.referenceScope.temporalDescription, source.referenceScope.sourceDataDate ?? "",
    source.referenceScope.updateFrequency, source.referenceScope.basis, source.referenceScope.limitations,
    "", "do sprawdzenia przed użyciem",
  ]));
  sources.eachRow((row, rowNumber) => { if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true }; });

  const examples = workbook.addWorksheet("Przyklady_bledow");
  examples.columns = [{ header: "Przypadek", key: "case", width: 28 }, { header: "Przykładowa wartość", key: "value", width: 40 }, { header: "Problem", key: "problem", width: 54 }, { header: "Zalecane działanie", key: "action", width: 56 }, { header: "Przykład syntetyczny", key: "synthetic", width: 22 }];
  examples.addRows([
    ["Zamienione współrzędne", "latitude=21.01; longitude=52.23", "Zakres wskazuje prawdopodobną zamianę osi dla Polski.", "Odrzuć do sprawdzenia z dostawcą. Nie zamieniaj automatycznie.", "TAK · nie używaj w terenie"],
    ["Nieznana licencja", "license_id=unknown", "Brak podstawy do ponownego udostępnienia.", "Wstrzymaj publikację i uzyskaj warunki od dysponenta.", "TAK · nie używaj w terenie"],
    ["Niepotwierdzony stan", "operational_status=unknown", "Źródło nie potwierdza sprawności urządzenia.", "Pozostaw unknown; nie wyciągaj wniosków z harmonogramu.", "TAK · nie używaj w terenie"],
    ["Możliwy duplikat", "Dwa punkty odległe o 8 metrów", "Mogą opisywać dwa urządzenia w jednym budynku.", "Pokaż kandydatów moderatorowi; nie łącz automatycznie.", "TAK · nie używaj w terenie"],
    ["Niepoprawny format", "latitude=abc", "Współrzędna nie jest liczbą WGS84.", "Odrzuć rekord i wskaż błąd w raporcie importu.", "TAK · nie używaj w terenie"],
  ]);
  styleHeader(examples, 5);
  examples.eachRow((row, rowNumber) => { if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true }; });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
