"use client";

import Papa from "papaparse";
import { useEffect, useRef, useState } from "react";

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
const primaryFields: MappingField[] = ["latitude", "longitude", "sourceRecordId", "name"];
const advancedFields = fields.filter((field) => !primaryFields.includes(field));

export function UploadWizard() {
  const [mode, setMode] = useState<"file" | "single">("file");
  const [single, setSingle] = useState({ id: "", name: "", address: "", latitude: "", longitude: "" });
  const fileRevision = useRef(0);
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
  const reportFocus = useRef<HTMLDivElement>(null);
  useEffect(() => { if (report) reportFocus.current?.focus(); }, [report]);
  const isCsv = file?.name.toLowerCase().endsWith(".csv") ?? false;
  const isXlsx = file?.name.toLowerCase().endsWith(".xlsx") ?? false;
  const fileTypeLabel = isCsv ? "Tabela CSV" : isXlsx ? "Wzorcowy arkusz XLSX" : "GeoJSON";
  const csvMode = mode === "file" && isCsv;
  const missingRequired = csvMode && (!headers.length || !mapping.latitude || !mapping.longitude || mapping.latitude === mapping.longitude);

  function selectFile(next: File | null) {
    const revision = ++fileRevision.current;
    setHeaders([]); setSample([]); setReport(null); setError("");
    if (next && (next.size > 5 * 1024 * 1024 || !/\.(csv|geojson|json|xlsx)$/i.test(next.name))) {
      setFile(null); setError("Wybierz plik CSV, GeoJSON lub XLSX o rozmiarze do 5 MB."); return;
    }
    setFile(next);
    if (!next || !next.name.toLowerCase().endsWith(".csv")) return;
    Papa.parse<Record<string, string>>(next, {
      header: true,
      preview: 6,
      skipEmptyLines: "greedy",
      complete: ({ meta, data }) => {
        if (revision !== fileRevision.current) return;
        setHeaders(meta.fields ?? []);
        setSample(data.slice(0, 4));
        const nextMapping = Object.fromEntries(fields.map((field) => [field, ""])) as Record<MappingField, string>;
        for (const field of fields) {
          const found = (meta.fields ?? []).find((header) => fieldPatterns[field].some((pattern) => pattern.test(header.trim().toLowerCase())));
          if (found) nextMapping[field] = found;
        }
        setMapping(nextMapping);
      },
      error: () => { if (revision === fileRevision.current) setError("Nie udało się odczytać nagłówków CSV."); },
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    let submittedFile = file;
    if (mode === "single") {
      const coords = [single.longitude, single.latitude].map((value) => {
        const normalized = value.trim().replace(",", ".");
        return /^[+-]?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
      });
      if (!coords.every(Number.isFinite) || Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) {
        setError("Sprawdź współrzędne. Szerokość musi mieścić się od −90 do 90, a długość od −180 do 180."); return;
      }
      if (!single.id.trim()) { setError("Podaj identyfikator wpisu w źródle."); return; }
      const geojson = { type: "FeatureCollection", features: [{ type: "Feature", id: single.id.trim(),
        geometry: { type: "Point", coordinates: coords }, properties: { name: single.name.trim(), "addr:full": single.address.trim() } }] };
      submittedFile = new File([JSON.stringify(geojson)], "zgloszenie-aed.geojson", { type: "application/geo+json" });
    }
    if (!submittedFile || missingRequired) { setError("Wybierz plik i sprawdź przypisanie współrzędnych."); return; }
    setBusy(true); setError(""); setReport(null);
    const form = new FormData();
    form.set("file", submittedFile); form.set("name", sourceName.trim()); form.set("url", sourceUrl.trim());
    form.set("submissionMethod", mode === "single" ? "manual" : "file");
    form.set("licenseId", license || "unknown"); form.set("attribution", attribution);
    form.set("referenceScope", JSON.stringify({
      geographyLabel: referenceGeography || "Nie podano przez dysponenta",
      geographyLevel: referenceGeographyLevel,
      temporalDescription: referenceTemporalDescription || "Nie podano okresu danych u źródła",
      sourceDataDate: sourceDataDate || null,
      updateFrequency: referenceUpdateFrequency || "Nie podano częstotliwości aktualizacji",
      basis: referenceBasis,
      limitations: referenceLimitations || "Nie zgłoszono ograniczeń; wymaga weryfikacji u dysponenta.",
    }));
    if (csvMode) form.set("mapping", JSON.stringify(mapping));
    try {
      const response = await fetch("/api/import", { method: "POST", body: form });
      const data = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(String(data.error ?? "Nie udało się zaimportować pliku."));
      setReport(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się zaimportować pliku.");
    } finally { setBusy(false); }
  }

  return <form className="upload-card aed-submission" onSubmit={submit}>
    <fieldset disabled={busy} className="submission-fields" hidden={Boolean(report)}>
    <div className="submission-modes" role="group" aria-label="Sposób dodawania danych">
      {(["file", "single"] as const).map((m) => <button type="button" key={m} aria-pressed={mode === m} onClick={() => { setMode(m); setError(""); setReport(null); }}>
        <strong>{m === "file" ? "Import pliku" : "Jeden AED"}</strong><span>{m === "file" ? "CSV, GeoJSON lub XLSX" : "Wpisz dane urządzenia"}</span></button>)}
    </div>
    {mode === "file" ? <div className="form-section"><h2>Wybierz plik</h2>
      <label className="file-drop"><span className="upload-symbol" aria-hidden="true">↑</span><strong>{file ? file.name : "Wybierz plik z urządzenia"}</strong><span>CSV, GeoJSON lub wzorcowy XLSX · do 5 MB</span><input type="file" aria-label="Wybierz plik z danymi AED" aria-describedby={error ? "upload-error" : undefined} accept=".csv,.geojson,.json,.xlsx,text/csv,application/geo+json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { selectFile(event.target.files?.[0] ?? null); event.target.value = ""; }} /></label>
      {file && <p className="file-meta">{(file.size / 1024).toFixed(1)} KB · {fileTypeLabel} <button className="text-button" type="button" onClick={() => selectFile(null)}>Usuń plik</button></p>}
      {isXlsx && <p className="form-help">Arkusz musi zawierać zakładkę <code>Dane_AED</code> z pobranego wzorca. Wiersze przechodzą tę samą walidację współrzędnych, licencji i pochodzenia co CSV oraz GeoJSON.</p>}
      <a href="/api/standard" download>Pobierz wzorcowy arkusz XLSX</a>
    </div> : <div className="form-section"><h2>Dane urządzenia</h2>
      <p>Użyj stałego identyfikatora, pod którym dysponent prowadzi ten wpis. Współrzędne określają położenie AED.</p>
      <div className="form-grid">{([
        ["id", "Identyfikator w źródle *", "Np. AED-01"], ["name", "Nazwa AED", "Np. AED przy recepcji"],
        ["address", "Adres urządzenia", "Ulica, numer i miejscowość"],
        ["latitude", "Szerokość geograficzna *", "Np. 52,2297"], ["longitude", "Długość geograficzna *", "Np. 21,0122"],
      ] as const).map(([key, label, example]) => <label className="field-label" key={key}>{label}<input value={single[key]} required={["id", "latitude", "longitude"].includes(key)}
        maxLength={key === "address" ? 500 : 160} inputMode={key === "latitude" || key === "longitude" ? "decimal" : "text"}
        placeholder={example} onChange={(e) => setSingle({ ...single, [key]: e.target.value })} /></label>)}</div>
    </div>}
    {csvMode && headers.length > 0 && <div className="form-section mapping-section"><h2>Dopasuj kolumny CSV</h2><p className="form-help">Sprawdź podpowiedzi dla szerokości i długości geograficznej. Każda współrzędna musi mieć własną kolumnę.</p>
      <div className="mapping-grid">{primaryFields.map((field) => <label key={field} className="field-label">{fieldLabels[field]}{field === "latitude" || field === "longitude" ? <span aria-hidden="true"> *</span> : null}
        <select value={mapping[field]} onChange={(event) => setMapping((previous) => ({ ...previous, [field]: event.target.value }))}>
          <option value="">— brak kolumny —</option>{headers.map((header) => <option key={`${field}-${header}`} value={header}>{header}</option>)}
        </select>
      </label>)}</div>
      <details className="advanced-mapping"><summary>Pozostałe kolumny, w tym adres, dostęp i TERYT</summary><div className="mapping-grid">{advancedFields.map((field) => <label key={field} className="field-label">{fieldLabels[field]}
        <select value={mapping[field]} onChange={(event) => setMapping((previous) => ({ ...previous, [field]: event.target.value }))}>
          <option value="">— brak kolumny —</option>{headers.map((header) => <option key={`${field}-${header}`} value={header}>{header}</option>)}
        </select>
      </label>)}</div></details>
      {sample.length > 0 && <div className="table-scroll" role="region" tabIndex={0} aria-label="Podgląd pierwszych wierszy importowanego pliku"><table className="preview-table"><caption>Podgląd pierwszych wierszy</caption><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{sample.map((row, index) => <tr key={index}>{headers.map((header) => <td key={header}>{row[header]}</td>)}</tr>)}</tbody></table></div>}
    </div>}
    {(mode === "single" || file) && <><div className="form-section"><h2>Pochodzenie danych</h2><p className="form-help">Podaj nazwę źródła i adres jego publikacji. Jeśli znasz licencję, wpisz ją poniżej.</p>
      <div className="form-grid"><label className="field-label">Nazwa źródła *<input required aria-required="true" aria-describedby={error ? "upload-error" : undefined} minLength={2} maxLength={120} value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Np. Rejestr AED miasta" /></label>
        <label className="field-label">Adres strony źródłowej *<input required aria-required="true" aria-describedby={error ? "upload-error" : undefined} type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></label>
        <label className="field-label">Identyfikator licencji<input value={license} onChange={(event) => setLicense(event.target.value)} placeholder="Np. CC BY 4.0 — jeśli nieznana, zostaw puste" /></label>
        <label className="field-label">Wymagane oznaczenie / atrybucja<input value={attribution} onChange={(event) => setAttribution(event.target.value)} placeholder="Np. Źródło: …" /></label>
      </div>
      <details className="advanced-mapping"><summary>Zakres źródła i data danych (opcjonalne)</summary><p>Wpisz zakres podany przez dysponenta.</p>
      <div className="form-grid"><label className="field-label">Zakres geograficzny<input value={referenceGeography} onChange={(event) => setReferenceGeography(event.target.value)} placeholder="Np. gmina, powiat, zasięg krajowy" /></label>
        <label className="field-label">Poziom zasięgu<select value={referenceGeographyLevel} onChange={(event) => setReferenceGeographyLevel(event.target.value)}><option value="unknown">Nieznany</option><option value="country">Krajowy</option><option value="voivodeship">Województwo</option><option value="county">Powiat</option><option value="municipality">Gmina / miasto</option><option value="locality">Miejscowość</option><option value="custom">Inny / mieszany</option></select></label>
        <label className="field-label">Data danych u źródła<input type="date" value={sourceDataDate} onChange={(event) => setSourceDataDate(event.target.value)} /></label>
        <label className="field-label">Okres / zakres czasowy<input value={referenceTemporalDescription} onChange={(event) => setReferenceTemporalDescription(event.target.value)} placeholder="Np. stan na dzień pobrania" /></label>
        <label className="field-label">Deklarowana częstotliwość<input value={referenceUpdateFrequency} onChange={(event) => setReferenceUpdateFrequency(event.target.value)} placeholder="Np. codziennie, jednorazowo" /></label>
        <label className="field-label">Podstawa opisu<select value={referenceBasis} onChange={(event) => setReferenceBasis(event.target.value)}><option value="unverified">Niezweryfikowana</option><option value="publisher_declared">Deklaracja dysponenta</option><option value="observed_export">Zaobserwowano w eksporcie</option></select></label>
        <label className="field-label form-wide">Ograniczenia i braki źródła<textarea rows={2} maxLength={1000} value={referenceLimitations} onChange={(event) => setReferenceLimitations(event.target.value)} placeholder="Np. brak potwierdzenia działania urządzeń lub część lokalizacji niedostępna publicznie" /></label>
      </div></details>
    </div>
    <div className="upload-actions"><p>Po przesłaniu rekordy trafią do poczekalni. Nie pojawią się w publicznym zbiorze bez zatwierdzenia rekordu i licencji.</p><button className="button button-primary" type="submit" disabled={busy || missingRequired}>{busy ? "Sprawdzanie pliku…" : "Sprawdź i dodaj do weryfikacji"}</button></div>
    {missingRequired && <p className="inline-error">Wskaż dwie różne kolumny szerokości i długości geograficznej.</p>}</>}
    </fieldset>
    {error && <p id="upload-error" className="error-box" role="alert">{error}</p>}
    {report && <div className="success-box" role="status" tabIndex={-1} ref={reportFocus}><strong>Import zakończony{Number(report.accepted) > 0 ? " — dane czekają na moderację." : " — brak nowych wpisów w kolejce."}</strong><p>Przyjęte rekordy: {String(report.accepted)} · odrzucone: {String(report.rejected)} · ostrzeżenia: {String(report.warningCount)}.</p>
      {Number(report.accepted) > 0 && <p>Administrator znajdzie wpisy w panelu „Do moderacji” → „Oczekujące AED”. Źródło jest zapisywane osobno do sprawdzenia pochodzenia i licencji.</p>}
      {Array.isArray(report.issues) && report.issues.length > 0 && <ul>{(report.issues as { message: string; severity: string; sourceRecordId: string | null }[]).slice(0, 12).map((issue, index) => <li key={index}><b>{issue.severity === "error" ? "Błąd" : "Uwaga"}:</b> {issue.message}{issue.sourceRecordId ? ` (rekord: ${issue.sourceRecordId})` : ""}</li>)}</ul>}
      <div className="report-actions">
        <button className="button button-primary" type="button" onClick={() => { selectFile(null); setSingle({ id: "", name: "", address: "", latitude: "", longitude: "" }); }}>Dodaj kolejne dane z tego źródła</button>
        {Number(report.rejected) > 0 && <button type="button" className="button button-outline" onClick={() => setReport(null)}>Popraw zgłoszenie</button>}
      </div>
    </div>}
  </form>;
}
