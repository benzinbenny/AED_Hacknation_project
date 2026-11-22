import { useMemo, useState, type FormEvent } from "react";
import type { AedRecord, EditStage, RecordChanges } from "../../domain/types";
import { RecordSourceCheck } from "./RecordSourceCheck";

type Selection = { record: AedRecord; version: string; deletionVersion: string; stage: EditStage };
const textLabels = {
  name: "Nazwa AED", address: "Adres", locationDescription: "Opis lokalizacji", operatorName: "Operator",
  accessNotes: "Warunki dostępu",
} as const;
const textFields = Object.keys(textLabels) as (keyof typeof textLabels)[];
const accessLabels = { public: "Publiczny", customers: "Dla użytkowników obiektu", restricted: "Ograniczony", private: "Prywatny", unknown: "Nieznany" };
const statusLabels = { reported_operational: "Zgłoszono jako sprawny", reported_out_of_service: "Zgłoszono niedostępność", unknown: "Niepotwierdzony" };

export function AdminRecordEditor({ published, pending, token, refresh, canEdit, removedSources, requestAdmin }: {
  published: AedRecord[]; pending: AedRecord[]; token: string; refresh: () => Promise<void>;
  canEdit: boolean; removedSources: string[]; requestAdmin: () => void;
}) {
  const [stage, setStage] = useState<EditStage>("published");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const needle = query.trim().toLocaleLowerCase("pl");
  const records = stage === "published" ? published : pending;
  const matches = useMemo(() => needle ? records.filter((r) =>
    [r.name, r.address, r.id, ...r.sources.map((s) => s.sourceRecordId)].some((s) => s?.toLocaleLowerCase("pl").includes(needle))) : records, [records, needle]);
  const lastPage = Math.max(0, Math.ceil(matches.length / 10) - 1);
  const currentPage = Math.min(page, lastPage);
  const headers = { "x-moderator-token": token };

  async function openRecord(id: string, deleting = false) {
    if (!canEdit) { requestAdmin(); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/moderation/${id}?stage=${stage}`, { headers, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConfirmDelete(deleting);
      setSelection({ record: data.record, version: data.version, deletionVersion: data.deletionVersion, stage });
    } catch (err) { setError(err instanceof Error ? err.message : "Nie udało się otworzyć wpisu."); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || busy) return;
    const { record, version, stage: editedStage } = selection;
    const form = new FormData(event.currentTarget);
    const changes: RecordChanges = {};
    for (const field of textFields) {
      const value = String(form.get(field) ?? "").trim() || null;
      if (value !== record[field]) changes[field] = value;
    }
    const latitude = Number(form.get("latitude"));
    const longitude = Number(form.get("longitude"));
    if (latitude !== record.location.latitude || longitude !== record.location.longitude) changes.location = { latitude, longitude };
    const accessType = form.get("accessType") as AedRecord["accessType"];
    const operationalStatus = form.get("operationalStatus") as AedRecord["operationalStatus"];
    if (accessType !== record.accessType) changes.accessType = accessType;
    if (operationalStatus !== record.operationalStatus) changes.operationalStatus = operationalStatus;
    setError(""); setMessage("");
    if (!Object.keys(changes).length) { setMessage("Brak zmian do zapisania."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/moderation/${record.id}`, {
        method: "PATCH", headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ version, stage: editedStage, changes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelection(null);
      await refresh();
      setMessage(editedStage === "pending" ? "Zapisano zmiany w kolejce moderacji." : "Zapisano zmiany w zatwierdzonym wpisie.");
    } catch (err) { setError(err instanceof Error ? err.message : "Nie udało się zapisać zmian."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!selection || !confirmDelete || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/moderation/${selection.record.id}`, {
        method: "DELETE", headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ stage: selection.stage, version: selection.deletionVersion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelection(null); setConfirmDelete(false);
      await refresh();
      setMessage("Usunięto wpis AED.");
    } catch (err) { setError(err instanceof Error ? err.message : "Nie udało się usunąć wpisu."); }
    finally { setBusy(false); }
  }

  const record = selection?.record;
  return <section className="moderation-section" aria-labelledby="edit-aed-title">
    <h2 id="edit-aed-title">{canEdit ? "Edycja wpisów AED" : "Zatwierdzone defibrylatory"}</h2>
    {record && confirmDelete && <div className="warning-box" role="group" aria-label="Potwierdzenie usunięcia">
      <h3>Usunąć {record.name ?? "wpis AED"}?</h3>
      <p>{record.address} · {record.sources.map((s) => s.sourceRecordId).join(", ")}</p>
      <p>Usuniesz wpis z katalogu, eksportów i kolejki, razem z jego scalonymi wersjami. Możesz go ponownie zgłosić lub pobrać ze źródła. Trafi wtedy do moderacji.</p>
      <div className="candidate-actions"><button autoFocus className="button button-outline" disabled={busy} onClick={() => setConfirmDelete(false)}>Wróć do edycji</button>
        <button className="button button-danger" disabled={busy} onClick={() => void remove()}>Potwierdź usunięcie</button></div>
    </div>}
    {record ? <form className="upload-card" hidden={confirmDelete} onSubmit={save}>
      <div className="form-section"><h3>{record.name ?? "AED bez nazwy"}</h3>
        <p>Zmiany dotyczą {selection.stage === "pending" ? "wpisu oczekującego na moderację" : "zatwierdzonego wpisu w katalogu"}. Źródło: {record.sources.map((s) => s.sourceRecordId).join(", ")}.</p>
        <div className="form-grid">
          {textFields.map((field) => <label key={field} className="field-label">{textLabels[field]}<input name={field} defaultValue={record[field] ?? ""} maxLength={2000} /></label>)}
          <label className="field-label">Szerokość geograficzna<input name="latitude" type="number" step="any" min="-90" max="90" defaultValue={record.location.latitude} required /></label>
          <label className="field-label">Długość geograficzna<input name="longitude" type="number" step="any" min="-180" max="180" defaultValue={record.location.longitude} required /></label>
          <label className="field-label">Rodzaj dostępu<select name="accessType" defaultValue={record.accessType}>{Object.entries(accessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field-label">Zgłoszony stan urządzenia<select name="operationalStatus" defaultValue={record.operationalStatus}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div></div>
      <div className="upload-actions"><button className="button button-primary" disabled={busy}>Zapisz zmiany</button>
        <button className="button button-outline" type="button" disabled={busy} onClick={() => { setSelection(null); setError(""); setMessage(""); }}>Anuluj edycję</button>
        <button className="button button-danger" type="button" disabled={busy} onClick={() => { setConfirmDelete(true); setMessage(""); setError(""); }}>Usuń wpis</button></div>
    </form> : <>
      <div className="form-grid">
        {canEdit && <label className="field-label">Zbiór wpisów<select disabled={busy} value={stage} onChange={(e) => { setStage(e.target.value as EditStage); setPage(0); }}>
          <option value="published">Zatwierdzone</option><option value="pending">Oczekujące</option></select></label>}
        <label className="field-label">{canEdit ? "Szukaj wpisu do edycji" : "Szukaj zatwierdzonego AED"}<input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Nazwa, adres lub identyfikator" /></label>
      </div>
      <div className="source-list">{matches.slice(currentPage * 10, (currentPage + 1) * 10).map((r) => <article className="source-card" key={r.id}>
        <div><strong>{r.name ?? "AED bez nazwy"}</strong><p>{r.address ?? r.locationDescription}</p><small>{r.sources.map((s) => s.sourceRecordId).join(", ")}</small></div>
        <div className="inventory-actions">
          <button className="button button-primary" disabled={busy} onClick={() => void openRecord(r.id)}>Uzupełnij dane</button>
          <button className="button button-danger" disabled={busy} onClick={() => void openRecord(r.id, true)}>Usuń AED</button>
        </div>
        {stage === "published" && <RecordSourceCheck record={r} token={token} removed={removedSources} />}
      </article>)}</div>
      {matches.length === 0 && <p>Brak pasujących wpisów.</p>}
      {lastPage > 0 && <nav className="queue-pagination" aria-label="Strony wpisów do edycji">
        <button className="button button-outline" disabled={busy || currentPage === 0} onClick={() => setPage(currentPage - 1)}>Poprzednia</button>
        <span>Strona {currentPage + 1} z {lastPage + 1}</span>
        <button className="button button-outline" disabled={busy || currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Następna</button>
      </nav>}
    </>}
    {error && <p className="error-box" role="alert">{error}</p>}
    {message && <p className="success-inline" role="status">{message}</p>}
  </section>;
}
