"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AedRecord } from "../../domain/types";
import { findDuplicateCandidates } from "../../domain/duplicates";
import type { ImportRun, MergeHistoryEvent, StoredSource } from "../../services/staging";
import { AED_SOURCE_CATALOG } from "../../sources/catalog";
import { AdminRecordEditor } from "./AdminRecordEditor";
import { SourceInventory } from "./SourceInventory";
import { SourceInstallationAction } from "./SourceInstallationAction";
import type { DiscoveredDataset } from "../../sources/discover";

const PENDING_PAGE_SIZE = 30;
const DUPLICATE_PREVIEW_SIZE = 40;

type Queue = { canEdit: boolean; uninstalledSourceIds: string[]; deletedSourceIds: string[]; forgottenSourceIds: string[]; records: AedRecord[]; pendingRecords: AedRecord[]; sources: StoredSource[]; importRuns: ImportRun[]; decisions: { recordId: string; decision: string; reason: string; decidedAt: string }[]; mergeHistory: MergeHistoryEvent[] };

export function ModeratorDesk({ demoToken }: { demoToken: string | null }) {
  const [token, setToken] = useState(demoToken ?? "");
  const [enteredKey, setEnteredKey] = useState(demoToken ?? "");
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [reason, setReason] = useState("");
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingMethod, setPendingMethod] = useState("all");
  const [pendingSource, setPendingSource] = useState("all");
  const [discovery, setDiscovery] = useState<{ datasets: DiscoveredDataset[]; errors: string[] } | null>(null);
  const [discoveryVersion, setDiscoveryVersion] = useState(0);
  const fetchVersion = useRef(0);
  const keyInput = useRef<HTMLInputElement>(null);
  function requestAdmin() {
    setMessage("Wpisz klucz administratora i wybierz „Otwórz kolejkę”, aby zarządzać tym wpisem.");
    keyInput.current?.focus();
    keyInput.current?.select();
  }
  const [panel, setPanel] = useState<"sources" | "records" | "queue" | "history">("sources");

  const refresh = useCallback(async () => {
    const version = ++fetchVersion.current;
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/moderation", { headers: { "x-moderator-token": token }, cache: "no-store" });
      const data = await response.json() as Queue & { error?: string };
      if (version !== fetchVersion.current) return;
      if (!response.ok) { setQueue(null); setError(data.error ?? "Nie udało się pobrać kolejki."); return; }
      setQueue(data);
    } catch {
      if (version === fetchVersion.current) { setQueue(null); setError("Błąd połączenia. Otwórz kolejkę ponownie."); }
    }
  }, [token]);

  useEffect(() => { if (token) void refresh(); }, [token, refresh]);

  async function reviewSource(source: StoredSource, status: "approved" | "blocked") {
    setBusy(source.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/moderation/source/${encodeURIComponent(source.id)}`, {
        method: "POST", headers: { "content-type": "application/json", "x-moderator-token": token }, body: JSON.stringify({ status }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się zaktualizować źródła.");
      await refresh();
      setMessage(status === "approved" ? "Licencja źródła zatwierdzona." : "Źródło zostało zablokowane.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaktualizować źródła.");
    } finally { setBusy(""); }
  }

  async function collectSource(sourceId: string) {
    const profile = AED_SOURCE_CATALOG.find((item) => item.id === sourceId);
    const sourceName = profile?.name ?? queue?.sources.find((item) => item.id === sourceId)?.name ?? sourceId;
    setBusy(`collect:${sourceId}`); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/collect/${encodeURIComponent(sourceId)}`, {
        method: "POST", headers: { "x-moderator-token": token },
      });
      const data = await response.json() as { accepted?: number; rejected?: number; warningCount?: number; sourceDataDate?: string | null; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Nie udało się pobrać danych ze źródła.");
      } else {
        await refresh();
        setMessage(`Pobrano ${sourceName}: przyjęto do kolejki ${data.accepted ?? 0}, błędy ${data.rejected ?? 0}, ostrzeżenia ${data.warningCount ?? 0}. Data danych: ${data.sourceDataDate ?? "niepodana"}.`);
        setPendingPage(0);
      }
    } catch {
      setError("Nie udało się połączyć z konektorem. Sprawdź dostępność źródła i spróbuj ponownie.");
    } finally {
      setBusy("");
    }
  }

  async function collectAllPublicSources() {
    setBusy("collect:all"); setError(""); setMessage("");
    setDiscovery(null);
    setMessage("Wyszukiwanie zbiorów AED w katalogu dane.gov.pl…");
    try {
      const response = await fetch("/api/moderation/discover", { method: "POST", headers: { "x-moderator-token": token }, cache: "no-store" });
      const result = await response.json() as { datasets: DiscoveredDataset[]; errors: string[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się wyszukać źródeł.");
      setDiscovery(result);
      setDiscoveryVersion((version) => version + 1);
    } catch (err) {
      setDiscovery({ datasets: [], errors: [err instanceof Error ? err.message : "Błąd wyszukiwania"] });
    }
    await refresh();
    setPendingPage(0);
    setMessage("Wyszukiwanie zakończone. Nowe źródła znajdziesz w zakładce „Do zainstalowania”.");
    setBusy("");
  }

  async function changeInstallation(id: string, installed: boolean) {
    setBusy("installation"); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/moderation/sources/${encodeURIComponent(id)}/installation`, {
        method: "PUT", headers: { "content-type": "application/json", "x-moderator-token": token }, body: JSON.stringify({ installed }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      await refresh();
      setMessage(installed ? "Zainstalowano źródło." : "Odinstalowano źródło. Historia i rekordy zostały zachowane.");
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Nie udało się zmienić instalacji."); return false; }
    finally { setBusy(""); }
  }

  async function removeSource(id: string) {
    setBusy("source-delete"); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/moderation/sources/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-moderator-token": token } });
      const data = await response.json() as { error?: string; removedCount?: number };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się usunąć źródła.");
      await refresh();
      setMessage(`Usunięto źródło i powiązane wersje AED: ${data.removedCount ?? 0}. Źródło znajduje się w zakładce „Usunięte źródła”.`);
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Nie udało się usunąć źródła."); return false; }
    finally { setBusy(""); }
  }

  async function purgeSource(id: string) {
    setBusy("source-purge"); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/moderation/sources/${encodeURIComponent(id)}?permanent=true`, { method: "DELETE", headers: { "x-moderator-token": token } });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się usunąć źródła.");
      await refresh();
      setMessage("Źródło usunięte z listy. Może zostać ponownie znalezione podczas wyszukiwania.");
    } catch (err) { setError(err instanceof Error ? err.message : "Nie udało się usunąć źródła."); }
    finally { setBusy(""); }
  }

  async function reviewRecord(record: AedRecord, decision: "approved" | "rejected") {
    setBusy(record.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/moderation/${encodeURIComponent(record.id)}`, {
        method: "POST", headers: { "content-type": "application/json", "x-moderator-token": token }, body: JSON.stringify({ decision, reason }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się zapisać decyzji.");
      setReason(""); await refresh();
      setMessage(decision === "approved" ? "Rekord opublikowany." : "Rekord odrzucony.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać decyzji.");
    } finally { setBusy(""); }
  }

  async function mergeRecords(survivingRecordId: string, mergedRecordId: string) {
    if (reason.trim().length < 5) { setError("Wpisz uzasadnienie scalenia (co najmniej 5 znaków)."); return; }
    setBusy("merge"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/moderation/merge", {
        method: "POST", headers: { "content-type": "application/json", "x-moderator-token": token },
        body: JSON.stringify({ survivingRecordId, mergedRecordId, reason }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się scalić rekordów.");
      setReason(""); await refresh();
      setMessage("Scalono rekordy; obie historie źródłowe pozostały przypięte. Scalenie można cofnąć.");
    } catch (err) { setError(err instanceof Error ? err.message : "Nie udało się scalić rekordów."); }
    finally { setBusy(""); }
  }

  async function undoMerge(event: MergeHistoryEvent) {
    setBusy(event.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/moderation/merge/${encodeURIComponent(event.id)}/undo`, { method: "POST", headers: { "x-moderator-token": token } });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się cofnąć scalenia.");
      await refresh();
      setMessage("Scalenie cofnięte; przywrócono oba zapisy sprzed decyzji.");
    } catch (err) { setError(err instanceof Error ? err.message : "Nie udało się cofnąć scalenia."); }
    finally { setBusy(""); }
  }

  const sources = queue?.sources ?? [];
  const allRecords = useMemo(() => queue ? [...queue.records, ...queue.pendingRecords] : [], [queue]);
  const byId = useMemo(() => new Map(allRecords.map((record) => [record.id, record])), [allRecords]);
  const publicIds = useMemo(() => new Set((queue?.records ?? []).map((record) => record.id)), [queue?.records]);
  const candidates = useMemo(() => panel === "history" ? findDuplicateCandidates(allRecords, 30) : [], [allRecords, panel]);
  const pendingRecords = useMemo(() => {
    const query = pendingSearch.trim().toLocaleLowerCase("pl");
    const sourceNames = new Map(sources.map((source) => [source.id, source.name]));
    return (queue?.pendingRecords ?? []).filter((record) => {
      const method = record.submissionMethod ?? (record.sources.some((source) => AED_SOURCE_CATALOG.some((profile) => profile.id === source.sourceId)) ? "connector" : "unknown");
      if (pendingMethod !== "all" && method !== pendingMethod) return false;
      if (pendingSource !== "all" && !record.sources.some((source) => source.sourceId === pendingSource)) return false;
      return !query || [
      record.name, record.address, record.locationDescription, record.id,
      ...record.sources.flatMap((source) => [source.sourceRecordId, source.sourceId, sourceNames.get(source.sourceId)]),
      ].some((value) => value?.toLocaleLowerCase("pl").includes(query));
    })
      .slice().sort((a, b) => {
        const latest = (record: AedRecord) => Math.max(0, ...record.sources.map((source) => Date.parse(source.fetchedAt) || 0));
        return latest(b) - latest(a);
      });
  }, [queue?.pendingRecords, sources, pendingSearch, pendingMethod, pendingSource]);
  const pendingSourceIds = useMemo(() => new Set((queue?.pendingRecords ?? []).flatMap((record) => record.sources.map((source) => source.sourceId))), [queue?.pendingRecords]);
  const pendingPageCount = Math.max(1, Math.ceil(pendingRecords.length / PENDING_PAGE_SIZE));
  const currentPendingPage = Math.min(pendingPage, pendingPageCount - 1);
  const visiblePending = pendingRecords.slice(currentPendingPage * PENDING_PAGE_SIZE, (currentPendingPage + 1) * PENDING_PAGE_SIZE);
  return <>
    <form className="moderator-access" onSubmit={(event) => { event.preventDefault(); if (enteredKey === token) void refresh(); else setToken(enteredKey); }}>
      <label className="field-label">Klucz administratora<input ref={keyInput} type="password" autoComplete="current-password" value={enteredKey} onChange={(event) => { fetchVersion.current++; setEnteredKey(event.target.value); setQueue(null); }} /></label>
      <button className="button button-primary" type="submit" disabled={!enteredKey || busy !== ""}>Otwórz kolejkę</button>
    </form>
    {error && <p className="error-box" role="alert">{error}</p>}{message && <p className="success-inline" role="status">{message}</p>}
    {queue && enteredKey === token && <>
      <p className="desk-role">Dostęp administratora</p>
      <nav className="desk-tiles" aria-label="Obszary moderacji">
        {([
          ["sources", "Źródła", "Instalacja i pobieranie", AED_SOURCE_CATALOG.filter((p) => !queue.uninstalledSourceIds.includes(p.id) && !queue.deletedSourceIds.includes(p.id) && !queue.forgottenSourceIds.includes(p.id)).length + sources.filter((s) => !AED_SOURCE_CATALOG.some((p) => p.id === s.id) && !queue.uninstalledSourceIds.includes(s.id) && !queue.deletedSourceIds.includes(s.id) && !queue.forgottenSourceIds.includes(s.id)).length],
          ["records", "Zatwierdzone AED", "Katalog i kontrola danych", queue.records.length],
          ["queue", "Do moderacji", "Licencje i zgłoszenia", queue.pendingRecords.length],
          ["history", "Historia i scalenia", "Importy, decyzje i duplikaty", queue.importRuns.length],
        ] as const).map(([key, title, help, count]) => <button key={key} type="button" aria-pressed={panel === key}
          onClick={() => { setPanel(key); setMessage(""); setError(""); }}><span>{count}</span>{" "}<strong>{title}</strong>{" "}<small>{help}</small></button>)}
      </nav>
      {panel === "records" && <AdminRecordEditor published={queue.records} pending={queue.pendingRecords} token={token} refresh={refresh} canEdit={queue.canEdit} requestAdmin={requestAdmin} removedSources={queue.uninstalledSourceIds} />}
      {panel === "sources" && <>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">WYSZUKIWANIE ŹRÓDEŁ</p><h2>Pobierz ze źródła</h2><p>Odświeżanie wyszukuje zbiory AED w dane.gov.pl. Nowe źródła trafiają do zakładki „Do zainstalowania”. Dane pobierzesz po instalacji.</p></div><button className="button button-primary" disabled={busy !== ""} onClick={() => void collectAllPublicSources()}>{busy === "collect:all" ? "Wyszukiwanie…" : "Odśwież publiczne źródła"}</button></div>
        {discovery && <section className="moderation-section" aria-labelledby="discovery-title"><h3 id="discovery-title">Wynik wyszukiwania w dane.gov.pl ({discovery.datasets.length})</h3><p>Znalezione źródła dostępne do instalacji znajdują się poniżej w zakładce „Do zainstalowania”. Źródła już zainstalowane lub usunięte pozostają w swoich zakładkach. Przed instalacją sprawdź zakres danych i licencję.</p>
          {discovery.errors.length > 0 && <p className="error-box" role="alert">Wyszukiwanie niepełne: {discovery.errors.join("; ")}</p>}
          {discovery.datasets.length === 0 && discovery.errors.length === 0 && <p>Nie znaleziono pasujących zbiorów.</p>}
        </section>}
        <SourceInventory sources={sources} runs={queue.importRuns} removed={queue.uninstalledSourceIds} deleted={queue.deletedSourceIds} forgotten={queue.forgottenSourceIds} discoveryVersion={discoveryVersion} records={queue.records} pending={queue.pendingRecords} canManage={queue.canEdit} requestAdmin={requestAdmin} busy={Boolean(busy)} collect={collectSource} change={changeInstallation} remove={removeSource} purge={purgeSource} />
        <p className="source-import-note">Token API Warszawy, jeśli został przyznany dysponentowi aplikacji, konfiguruje się po stronie serwera jako <code>AED_WARSAW_API_TOKEN</code>. Nie wpisuj sekretu w przeglądarce.</p>
      </section></>}
      {panel === "history" && <>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">KANDYDACI, NIE AUTOMATYCZNE DUPLIKATY</p><h2>Podobne lokalizacje</h2><p>Odległość jest sygnałem do sprawdzenia. Nie łącz urządzeń bez potwierdzenia u źródła.</p></div></div>
        <label className="field-label reason-field">Uzasadnienie scalenia<input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} /></label>
        {candidates.length === 0 ? <div className="empty-state compact"><strong>Brak bliskich par do sprawdzenia</strong><p>Próg demonstracyjny wynosi 30 metrów.</p></div> : <>
          {candidates.length > DUPLICATE_PREVIEW_SIZE && <p className="source-import-note">Wyświetlono {DUPLICATE_PREVIEW_SIZE} z {candidates.length} kandydatów. Zawężenie pełnej kolejki wymaga filtrów w magazynie produkcyjnym.</p>}
          <div className="candidate-list">{candidates.slice(0, DUPLICATE_PREVIEW_SIZE).map((candidate) => {
            const first = byId.get(candidate.recordIds[0]); const second = byId.get(candidate.recordIds[1]);
            if (!first || !second) return null;
            const bothPublic = publicIds.has(first.id) && publicIds.has(second.id);
            return <article className="candidate-card" key={candidate.recordIds.join(":")}><div><strong>{first.name ?? first.id.slice(0, 8)} ↔ {second.name ?? second.id.slice(0, 8)}</strong><p>{candidate.distanceMeters} m · {candidate.independentSources} niezależne źródła · {bothPublic ? "oba rekordy publiczne" : "co najmniej jeden rekord czeka na moderację"}</p></div>
              {bothPublic ? <div className="candidate-actions"><button className="button button-small button-outline" disabled={busy !== ""} onClick={() => void mergeRecords(first.id, second.id)}>Zachowaj 1., scal 2.</button><button className="button button-small button-outline" disabled={busy !== ""} onClick={() => void mergeRecords(second.id, first.id)}>Zachowaj 2., scal 1.</button></div> : <span className="license-status license-needs_review">Wymaga osobnej decyzji</span>}
            </article>;
          })}</div>
        </>}
      </section></>}
      {panel === "queue" && <div className="queue-layout">
      <section className="moderation-section pending-section"><div className="section-heading"><div><p className="eyebrow">PRZEGLĄD REKORD PO REKORDZIE</p><h2>Oczekujące AED <span className="count-pill">{queue.pendingRecords.length}</span></h2><p>Nowe zgłoszenia i wpisy z plików trafiają tutaj. Aby zatwierdzić wpis, sprawdź też licencję jego źródła poniżej.</p></div></div>
        <label className="field-label reason-field">Szukaj oczekującego AED lub źródła<input type="search" value={pendingSearch} onChange={(event) => { setPendingSearch(event.target.value); setPendingPage(0); }} placeholder="Nazwa, adres, identyfikator lub źródło" /></label>
        <div className="form-grid">
          <label className="field-label">Sposób dodania<select value={pendingMethod} onChange={(event) => { setPendingMethod(event.target.value); setPendingPage(0); }}>
            <option value="all">Wszystkie wpisy</option><option value="manual">Dodane ręcznie</option><option value="file">Przesłane w pliku</option><option value="connector">Pobrane z baz</option><option value="unknown">Starsze bez oznaczenia</option>
          </select></label>
          <label className="field-label">Źródło<select value={pendingSource} onChange={(event) => { setPendingSource(event.target.value); setPendingPage(0); }}>
            <option value="all">Wszystkie źródła</option>{sources.filter((source) => pendingSourceIds.has(source.id)).map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
          </select></label>
        </div>
        <label className="field-label reason-field">Uzasadnienie decyzji (opcjonalne)<input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Np. lokalizacja potwierdzona u dysponenta" /></label>
        {pendingRecords.length === 0 ? <div className="empty-state compact"><strong>{queue.pendingRecords.length ? "Brak pasujących wpisów" : "Kolejka jest pusta"}</strong><p>{queue.pendingRecords.length ? "Zmień wyszukiwane hasło." : "Zgłoszenia i wpisy z plików pojawią się tutaj."}</p></div> : <>
          <p className="source-import-note">Najnowsze zgłoszenia najpierw · wyświetlono {currentPendingPage * PENDING_PAGE_SIZE + 1}–{Math.min((currentPendingPage + 1) * PENDING_PAGE_SIZE, pendingRecords.length)} z {pendingRecords.length} pasujących rekordów.</p>
          <div className="pending-list">{visiblePending.map((record) => {
          const recordSources = record.sources.map((reference) => sources.find((source) => source.id === reference.sourceId)).filter((source): source is StoredSource => Boolean(source));
          const canApprove = recordSources.length > 0 && recordSources.every((source) => source.licenseReviewStatus === "approved" && (source.synthetic || (source.licenseId && source.licenseId !== "unknown")));
          const methodLabel = record.submissionMethod === "manual" ? "Dodano ręcznie" : record.submissionMethod === "file" ? "Przesłano w pliku" : record.sources.some((source) => AED_SOURCE_CATALOG.some((profile) => profile.id === source.sourceId)) ? "Pobrano z bazy" : "Starsze zgłoszenie";
          return <article className="pending-card" key={record.id}><div className="pending-card-heading"><div><span className="eyebrow">{methodLabel} · REKORD {record.id.slice(0, 8)}</span><h3>{record.name ?? "AED bez nazwy"}</h3></div><span className={canApprove ? "license-status license-approved" : "license-status license-needs_review"}>{canApprove ? "Można rozpatrzyć" : "Najpierw sprawdź licencję"}</span></div>
            <p>{record.address ?? "Brak adresu"} · {record.location.latitude.toFixed(5)}, {record.location.longitude.toFixed(5)}</p>
            <p className="source-inline">Źródło: {recordSources.map((source) => source.name).join(", ") || "nieznane"}. Dostęp: {record.accessType}; stan zgłoszony: {record.operationalStatus}.</p>
            <div className="pending-actions"><button className="button button-primary" disabled={!canApprove || busy === record.id} onClick={() => void reviewRecord(record, "approved")}>Zatwierdź rekord</button><button className="button button-outline" disabled={busy === record.id} onClick={() => void reviewRecord(record, "rejected")}>Odrzuć</button></div>
          </article>;
        })}</div>
          {pendingPageCount > 1 && <nav className="queue-pagination" aria-label="Strony kolejki">
            <button className="button button-small button-outline" disabled={currentPendingPage === 0} onClick={() => setPendingPage(currentPendingPage - 1)}>Poprzednia</button>
            <span>Strona {currentPendingPage + 1} z {pendingPageCount}</span>
            <button className="button button-small button-outline" disabled={currentPendingPage + 1 >= pendingPageCount} onClick={() => setPendingPage(currentPendingPage + 1)}>Następna</button>
          </nav>}
        </>}
      </section>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">LICENCJE I POCHODZENIE</p><h2>Źródła danych <span className="count-pill">{sources.filter((source) => !queue.deletedSourceIds.includes(source.id)).length}</span></h2><p>Najpierw sprawdź warunki ponownego wykorzystania i wymaganą atrybucję.</p></div></div>
        <div className="source-list">{sources.filter((source) => !queue.deletedSourceIds.includes(source.id)).map((source) => <article className="source-card" key={source.id}>
          <div><strong>{source.name}</strong><p><a href={source.url} target="_blank" rel="noreferrer">{source.url} ↗</a></p><small>Licencja: {source.licenseId || "nieznana"} · Oznaczenie: {source.attribution || "brak"} · {source.synthetic ? "zbiór syntetyczny" : "źródło zewnętrzne"}</small></div>
          <span className={`license-status license-${source.licenseReviewStatus}`}>{source.licenseReviewStatus === "approved" ? "Zatwierdzone" : source.licenseReviewStatus === "blocked" ? "Zablokowane" : "Do sprawdzenia"}</span>
          <div>
            {queue.uninstalledSourceIds.includes(source.id) && <p>Źródło odinstalowane</p>}
            <SourceInstallationAction id={source.id} name={source.name} installed={!queue.uninstalledSourceIds.includes(source.id)} busy={Boolean(busy)} canManage={queue.canEdit} requestAdmin={requestAdmin} change={async (id, installed) => { await changeInstallation(id, installed); }} />
          </div>
          {!source.synthetic && source.licenseReviewStatus !== "approved" && <div className="source-actions">{source.licenseId && source.licenseId !== "unknown" ? <button className="button button-small button-primary" disabled={busy === source.id} onClick={() => void reviewSource(source, "approved")}>Zatwierdź licencję</button> : <span className="license-status license-blocked">Brak identyfikatora licencji — nie można zatwierdzić</span>}<button className="button button-small button-outline" disabled={busy === source.id} onClick={() => void reviewSource(source, "blocked")}>Zablokuj</button></div>}
        </article>)}</div>
      </section></div>}
      {panel === "history" && <>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">ŚLAD DECYZJI</p><h2>Ostatnie importy i decyzje</h2></div></div>
        <div className="audit-grid"><article className="audit-card"><h3>Importy</h3>{queue.importRuns.slice(0, 5).map((run) => <p key={run.id}><strong>{sources.find((source) => source.id === run.sourceId)?.name ?? run.sourceId}</strong><small>{new Date(run.fetchedAt).toLocaleString("pl-PL")} · przyjęto {run.importedCount} · odrzucono {run.rejectedCount}</small></p>)}{queue.importRuns.length === 0 && <p>Brak importów.</p>}</article>
          <article className="audit-card"><h3>Decyzje</h3>{queue.decisions.slice(0, 5).map((decision, index) => <p key={`${decision.recordId}-${index}`}><strong>{decision.decision === "approved" ? "Zatwierdzono" : "Odrzucono"} · {decision.recordId.slice(0, 8)}</strong><small>{new Date(decision.decidedAt).toLocaleString("pl-PL")} · {decision.reason || "bez uzasadnienia"}</small></p>)}{queue.decisions.length === 0 && <p>Brak decyzji.</p>}</article></div>
      </section>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">SCALENIA I COFNIĘCIA</p><h2>Historia łączenia rekordów</h2></div></div>
        {queue.mergeHistory.length === 0 ? <div className="empty-state compact"><strong>Brak decyzji o scaleniu</strong><p>Każde ręczne scalenie będzie można tu cofnąć.</p></div> : <div className="source-list">{queue.mergeHistory.slice(0, 12).map((event) => <article className="source-card" key={event.id}><div><strong>{event.invalidatedAt ? "Usunięto scalony wpis" : event.status === "merged" ? "Scalono" : "Cofnięto scalenie"}: {event.survivingRecordId.slice(0, 8)} ← {event.mergedRecordId.slice(0, 8)}</strong><p>{event.reason || "bez uzasadnienia"}</p><small>{new Date(event.invalidatedAt ?? event.undoneAt ?? event.decidedAt).toLocaleString("pl-PL")}</small></div>{event.status === "merged" && !event.invalidatedAt && <button className="button button-small button-outline" disabled={busy !== ""} onClick={() => void undoMerge(event)}>Cofnij scalenie</button>}</article>)}</div>}
      </section>
      </>}
    </>}
  </>;
}
