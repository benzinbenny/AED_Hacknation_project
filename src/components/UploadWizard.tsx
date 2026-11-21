"use client";

import Papa from "papaparse";
import { useState } from "react";

type MappingField = "sourceRecordId" | "name" | "latitude" | "longitude" | "operatorName" | "address" | "locationDescription" | "access" | "accessNotes" | "openingHours" | "availabilityState" | "operationalStatus" | "lastVerifiedAt" | "verificationMethod" | "externalReference" | "coordinateAccuracyMeters" | "countryCode" | "voivodeship" | "county" | "municipality" | "locality" | "postalCode" | "terytTerc" | "terytSimc" | "indoor" | "floor" | "entranceDescription" | "timezone" | "availabilityEvaluatedAt" | "operationalStatusObservedAt" | "verificationActorType" | "verificationScope" | "nextVerificationDueAt" | "recordStatus" | "sourceUpdatedAt";
const fieldLabels: Record<MappingField, string> = {
  sourceRecordId: "Identyfikator źródłowy", name: "Nazwa", latitude: "Szerokość geograficzna", longitude: "Długość geograficzna",
  operatorName: "Operator", address: "Adres", locationDescription: "Opis miejsca", access: "Dostęp", accessNotes: "Warunki dostępu", openingHours: "Godziny dostępu", availabilityState: "Dostępność według harmonogramu", operationalStatus: "Zgłoszony stan urządzenia", lastVerifiedAt: "Data ostatniej weryfikacji", verificationMethod: "Metoda weryfikacji",
  externalReference: "Identyfikator / odnośnik zewnętrzny", coordinateAccuracyMeters: "Dokładność współrzędnych (m)", countryCode: "Kod kraju", voivodeship: "Województwo", county: "Powiat", municipality: "Gmina / miasto", locality: "Miejscowość", postalCode: "Kod pocztowy", terytTerc: "TERYT TERC", terytSimc: "TERYT SIMC", indoor: "Wewnątrz / na zewnątrz", floor: "Piętro / poziom", entranceDescription: "Opis wejścia", timezone: "Strefa czasowa", availabilityEvaluatedAt: "Czas oceny harmonogramu", operationalStatusObservedAt: "Czas obserwacji stanu", verificationActorType: "Rodzaj weryfikującego", verificationScope: "Zakres weryfikacji", nextVerificationDueAt: "Termin kolejnej weryfikacji", recordStatus: "Status wpisu", sourceUpdatedAt: "Aktualizacja źródła",
};
const fieldPatterns: Record<MappingField, RegExp[]> = {
  sourceRecordId: [/^aed_id$/, /^source_record_id$/, /^id$/, /source.?id/, /identyfikator/], name: [/^name$/, /^nazwa$/], latitude: [/^latitude$/, /^lat$/, /szerokość/], longitude: [/^longitude$/, /^lon$/, /długość/, /^lng$/],
  operatorName: [/^operator$/, /dysponent/], address: [/^address$/, /^adres$/], locationDescription: [/location.?description/, /opis.*lokal/], access: [/^access_type$/, /^access$/, /^typ dostępu$/, /^dostęp$/], accessNotes: [/^access_notes$/, /warunki.*dostępu/], openingHours: [/^opening_hours_raw$/, /^opening.?hours$/, /godziny/, /^hours$/], availabilityState: [/^availability_state$/, /dostępność.*harmonogram/], operationalStatus: [/^operational_status$/, /zgłoszony stan/], lastVerifiedAt: [/^last_verified_at$/, /data.*weryfikacji/], verificationMethod: [/^verification_method$/, /metoda.*weryfikacji/],
  externalReference: [/^external_reference$/, /odnośnik.*zewnętrzny/], coordinateAccuracyMeters: [/^coordinate_accuracy_m$/, /dokładność.*współrzędnych/], countryCode: [/^country_code$/], voivodeship: [/^voivodeship$/, /województwo/], county: [/^county$/, /^powiat$/], municipality: [/^municipality$/, /gmina/, /miasto/], locality: [/^locality$/, /miejscowość/], postalCode: [/^postal_code$/, /kod pocztowy/], terytTerc: [/^teryt_terc$/], terytSimc: [/^teryt_simc$/], indoor: [/^indoor$/, /wewnątrz/], floor: [/^floor$/, /piętro/, /poziom/], entranceDescription: [/^entrance_description$/, /opis wejścia/], timezone: [/^timezone$/], availabilityEvaluatedAt: [/^availability_evaluated_at$/], operationalStatusObservedAt: [/^operational_status_observed_at$/], verificationActorType: [/^verification_actor_type$/], verificationScope: [/^verification_scope$/], nextVerificationDueAt: [/^next_verification_due_at$/], recordStatus: [/^record_status$/], sourceUpdatedAt: [/^source_updated_at$/],
};
const fields = Object.keys(fieldLabels) as MappingField[];
const primaryFields: MappingField[] = ["sourceRecordId", "name", "latitude", "longitude", "operatorName", "address", "locationDescription", "access", "accessNotes", "openingHours", "availabilityState", "operationalStatus", "lastVerifiedAt", "verificationMethod"];
const advancedFields = fields.filter((field) => !primaryFields.includes(field));

export function UploadWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sample, setSample] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<MappingField, string>>(Object.fromEntries(fields.map((field) => [field, ""])) as Record<MappingField, string>);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [license, setLicense] = useState("");
  const [attribution, setAttribution] = useState("");
  const [referenceGeography, setReferenceGeography] = useState("");
  const [referenceGeographyLevel, setReferenceGeographyLevel] = useState("unknown");
  const [referenceTemporalDescription, setReferenceTemporalDescription] = useState("");
  const [sourceDataDate, setSourceDataDate] = useState("");
  const [referenceUpdateFrequency, setReferenceUpdateFrequency] = useState("");
  const [referenceBasis, setReferenceBasis] = useState("unverified");
  const [referenceLimitations, setReferenceLimitations] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const isCsv = file?.name.toLowerCase().endsWith(".csv") ?? false;
  const isXlsx = file?.name.toLowerCase().endsWith(".xlsx") ?? false;
  const fileTypeLabel = isCsv ? "Tabela CSV" : isXlsx ? "Wzorcowy arkusz XLSX" : "GeoJSON";
  const missingRequired = isCsv && (!mapping.latitude || !mapping.longitude);

  function selectFile(next: File | null) {
    setFile(next); setHeaders([]); setSample([]); setReport(null); setError("");
    if (!next || !next.name.toLowerCase().endsWith(".csv")) return;
    Papa.parse<Record<string, string>>(next, {
      header: true,
      preview: 6,
      skipEmptyLines: "greedy",
      complete: ({ meta, data }) => {
        setHeaders(meta.fields ?? []);
        setSample(data.slice(0, 4));
        const nextMapping = Object.fromEntries(fields.map((field) => [field, ""])) as Record<MappingField, string>;
        for (const field of fields) {
          const found = (meta.fields ?? []).find((header) => fieldPatterns[field].some((pattern) => pattern.test(header.trim().toLowerCase())));
          if (found) nextMapping[field] = found;
        }
        setMapping(nextMapping);
      },
      error: () => setError("Nie udało się odczytać nagłówków CSV."),
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError("Wybierz plik do przesłania."); return; }
    setBusy(true); setError(""); setReport(null);
    const form = new FormData();
    form.set("file", file); form.set("name", sourceName); form.set("url", sourceUrl);
    form.set("licenseId", license || "unknown"); form.set("attribution", attribution || sourceName);
    form.set("referenceScope", JSON.stringify({
      geographyLabel: referenceGeography || "Nie podano przez dysponenta",
      geographyLevel: referenceGeographyLevel,
      temporalDescription: referenceTemporalDescription || "Nie podano okresu danych u źródła",
      sourceDataDate: sourceDataDate || null,
      updateFrequency: referenceUpdateFrequency || "Nie podano częstotliwości aktualizacji",
      basis: referenceBasis,
      limitations: referenceLimitations || "Nie zgłoszono ograniczeń; wymaga weryfikacji u dysponenta.",
    }));
    if (isCsv) form.set("mapping", JSON.stringify(mapping));
    try {
      const response = await fetch("/api/import", { method: "POST", body: form });
      const data = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(String(data.error ?? "Nie udało się zaimportować pliku."));
      setReport(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się zaimportować pliku.");
    } finally { setBusy(false); }
  }

  return <form className="upload-card" onSubmit={submit}>
    <div className="form-section"><p className="eyebrow">KROK 1 · WYBIERZ PLIK</p>
      <label className="file-drop"><span className="upload-symbol" aria-hidden="true">↑</span><strong>{file ? file.name : "Upuść plik lub wybierz z urządzenia"}</strong><span>CSV, GeoJSON lub wzorcowy XLSX · do 5 MB</span><input type="file" aria-describedby={error ? "upload-error" : undefined} accept=".csv,.geojson,.json,.xlsx,text/csv,application/geo+json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} /></label>
      {file && <p className="file-meta">{(file.size / 1024).toFixed(1)} KB · {fileTypeLabel} <button className="text-button" type="button" onClick={() => selectFile(null)}>Usuń plik</button></p>}
      {isXlsx && <p className="form-help">Arkusz musi zawierać zakładkę <code>Dane_AED</code> z pobranego wzorca. Wiersze przechodzą tę samą walidację współrzędnych, licencji i pochodzenia co CSV oraz GeoJSON.</p>}
    </div>
    {isCsv && headers.length > 0 && <div className="form-section mapping-section"><p className="eyebrow">KROK 2 · DOPASUJ KOLUMNY</p><p className="form-help">Automatyczne podpowiedzi możesz zmienić. Wymagane są współrzędne; identyfikator źródłowy jest zalecany. Dodatkowe pola są w sekcji rozszerzonej.</p>
      <div className="mapping-grid">{primaryFields.map((field) => <label key={field} className="field-label">{fieldLabels[field]}{field === "latitude" || field === "longitude" ? <span aria-hidden="true"> *</span> : null}
        <select value={mapping[field]} onChange={(event) => setMapping((previous) => ({ ...previous, [field]: event.target.value }))}>
          <option value="">— brak kolumny —</option>{headers.map((header) => <option key={`${field}-${header}`} value={header}>{header}</option>)}
        </select>
      </label>)}</div>
      <details className="advanced-mapping"><summary>Pola rozszerzone: TERYT, dostęp i weryfikacja</summary><div className="mapping-grid">{advancedFields.map((field) => <label key={field} className="field-label">{fieldLabels[field]}
        <select value={mapping[field]} onChange={(event) => setMapping((previous) => ({ ...previous, [field]: event.target.value }))}>
          <option value="">— brak kolumny —</option>{headers.map((header) => <option key={`${field}-${header}`} value={header}>{header}</option>)}
        </select>
      </label>)}</div></details>
      {sample.length > 0 && <div className="table-scroll" role="region" tabIndex={0} aria-label="Podgląd pierwszych wierszy importowanego pliku"><table className="preview-table"><caption>Podgląd pierwszych wierszy</caption><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{sample.map((row, index) => <tr key={index}>{headers.map((header) => <td key={header}>{row[header]}</td>)}</tr>)}</tbody></table></div>}
    </div>}
    <div className="form-section"><p className="eyebrow">{isCsv ? "KROK 3 · POCHODZENIE" : "KROK 2 · POCHODZENIE"}</p><p className="form-help">Te informacje są zachowywane przy każdym rekordzie. Bez potwierdzonej licencji publikacja danych będzie zablokowana.</p>
      <div className="form-grid"><label className="field-label">Nazwa źródła *<input required aria-required="true" aria-describedby={error ? "upload-error" : undefined} minLength={2} maxLength={120} value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Np. Rejestr AED miasta" /></label>
        <label className="field-label">Adres strony źródłowej *<input required aria-required="true" aria-describedby={error ? "upload-error" : undefined} type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></label>
        <label className="field-label">Identyfikator licencji<input value={license} onChange={(event) => setLicense(event.target.value)} placeholder="Np. CC BY 4.0 — jeśli nieznana, zostaw puste" /></label>
        <label className="field-label">Wymagane oznaczenie / atrybucja<input value={attribution} onChange={(event) => setAttribution(event.target.value)} placeholder="Np. Źródło: …" /></label>
      </div>
      <p className="eyebrow scope-fields-title">ZAKRES REFERENCYJNY ŹRÓDŁA</p><p className="form-help">Wpisz zakres podany przez dysponenta. Jeśli go nie znasz, aplikacja zachowa to jako niepotwierdzone.</p>
      <div className="form-grid"><label className="field-label">Zakres geograficzny<input value={referenceGeography} onChange={(event) => setReferenceGeography(event.target.value)} placeholder="Np. gmina, powiat, zasięg krajowy" /></label>
        <label className="field-label">Poziom zasięgu<select value={referenceGeographyLevel} onChange={(event) => setReferenceGeographyLevel(event.target.value)}><option value="unknown">Nieznany</option><option value="country">Krajowy</option><option value="voivodeship">Województwo</option><option value="county">Powiat</option><option value="municipality">Gmina / miasto</option><option value="locality">Miejscowość</option><option value="custom">Inny / mieszany</option></select></label>
        <label className="field-label">Data danych u źródła<input type="date" value={sourceDataDate} onChange={(event) => setSourceDataDate(event.target.value)} /></label>
        <label className="field-label">Okres / zakres czasowy<input value={referenceTemporalDescription} onChange={(event) => setReferenceTemporalDescription(event.target.value)} placeholder="Np. stan na dzień pobrania" /></label>
        <label className="field-label">Deklarowana częstotliwość<input value={referenceUpdateFrequency} onChange={(event) => setReferenceUpdateFrequency(event.target.value)} placeholder="Np. codziennie, jednorazowo" /></label>
        <label className="field-label">Podstawa opisu<select value={referenceBasis} onChange={(event) => setReferenceBasis(event.target.value)}><option value="unverified">Niezweryfikowana</option><option value="publisher_declared">Deklaracja dysponenta</option><option value="observed_export">Zaobserwowano w eksporcie</option></select></label>
        <label className="field-label form-wide">Ograniczenia i braki źródła<textarea rows={2} maxLength={1000} value={referenceLimitations} onChange={(event) => setReferenceLimitations(event.target.value)} placeholder="Np. brak potwierdzenia działania urządzeń lub część lokalizacji niedostępna publicznie" /></label>
      </div>
    </div>
    <div className="upload-actions"><p>Po przesłaniu rekordy trafią do poczekalni. Nie pojawią się w publicznym zbiorze bez zatwierdzenia rekordu i licencji.</p><button className="button button-primary" type="submit" disabled={busy || missingRequired}>{busy ? "Sprawdzanie pliku…" : "Sprawdź i dodaj do weryfikacji"}</button></div>
    {missingRequired && <p className="inline-error">Wskaż kolumny szerokości i długości geograficznej.</p>}
    {error && <p id="upload-error" className="error-box" role="alert">{error}</p>}
    {report && <div className="success-box" role="status"><strong>Import zakończony — dane czekają na moderację.</strong><p>Przyjęte rekordy: {String(report.accepted)} · odrzucone: {String(report.rejected)} · ostrzeżenia: {String(report.warningCount)}.</p><p>Źródło otrzymało status „do sprawdzenia”. Moderator musi zweryfikować licencję przed publikacją.</p>
      {Array.isArray(report.issues) && report.issues.length > 0 && <ul>{(report.issues as { message: string; severity: string; sourceRecordId: string | null }[]).slice(0, 12).map((issue, index) => <li key={index}><b>{issue.severity === "error" ? "Błąd" : "Uwaga"}:</b> {issue.message}{issue.sourceRecordId ? ` (rekord: ${issue.sourceRecordId})` : ""}</li>)}</ul>}
    </div>}
  </form>;
}
