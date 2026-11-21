"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AedRecord } from "../domain/types";
import { findDuplicateCandidates } from "../domain/duplicates";
import type { ImportRun, MergeHistoryEvent, StoredSource } from "../services/staging";
import { AED_SOURCE_CATALOG } from "../sources/catalog";

const PENDING_PAGE_SIZE = 30;
const DUPLICATE_PREVIEW_SIZE = 40;

type Queue = { records: AedRecord[]; pendingRecords: AedRecord[]; sources: StoredSource[]; importRuns: ImportRun[]; decisions: { recordId: string; decision: string; reason: string; decidedAt: string }[]; mergeHistory: MergeHistoryEvent[] };

export function ModeratorDesk({ demoToken }: { demoToken: string | null }) {
  const [token, setToken] = useState(demoToken ?? "");
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [reason, setReason] = useState("");
  const [pendingPage, setPendingPage] = useState(0);

  const refresh = useCallback(async () => {
    setError(""); setMessage("");
    const response = await fetch("/api/moderation", { headers: { "x-moderator-token": token }, cache: "no-store" });
    const data = await response.json() as Queue & { error?: string };
    if (!response.ok) { setQueue(null); setError(data.error ?? "Nie udało się pobrać kolejki."); return; }
    setQueue(data);
  }, [token]);

  useEffect(() => { if (token) void refresh(); }, [token, refresh]);

  async function reviewSource(source: StoredSource, status: "approved" | "blocked") {
    setBusy(source.id); setError(""); setMessage("");
    const response = await fetch(`/api/moderation/source/${encodeURIComponent(source.id)}`, {
      method: "POST", headers: { "content-type": "application/json", "x-moderator-token": token }, body: JSON.stringify({ status }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error ?? "Nie udało się zaktualizować źródła.");
    else { setMessage(status === "approved" ? "Licencja źródła zatwierdzona." : "Źródło zostało zablokowane."); await refresh(); }
    setBusy("");
  }

  async function collectSource(sourceId: string) {
    const profile = AED_SOURCE_CATALOG.find((item) => item.id === sourceId);
    if (!profile) return;
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
        setMessage(`Pobrano ${profile.name}: przyjęto do kolejki ${data.accepted ?? 0}, błędy ${data.rejected ?? 0}, ostrzeżenia ${data.warningCount ?? 0}. Data danych: ${data.sourceDataDate ?? "niepodana"}.`);
        setPendingPage(0);
      }
    } catch {
      setError("Nie udało się połączyć z konektorem. Sprawdź dostępność źródła i spróbuj ponownie.");
    } finally {
      setBusy("");
    }
  }

  async function reviewRecord(record: AedRecord, decision: "approved" | "rejected") {
    setBusy(record.id); setError(""); setMessage("");
    const response = await fetch(`/api/moderation/${encodeURIComponent(record.id)}`, {
      method: "POST", headers: { "content-type": "application/json", "x-moderator-token": token }, body: JSON.stringify({ decision, reason }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error ?? "Nie udało się zapisać decyzji.");
    else { setMessage(decision === "approved" ? "Rekord opublikowany." : "Rekord odrzucony."); setReason(""); await refresh(); }
    setBusy("");
  }

  async function mergeRecords(survivingRecordId: string, mergedRecordId: string) {
    if (reason.trim().length < 5) { setError("Wpisz uzasadnienie scalenia (co najmniej 5 znaków)."); return; }
    setBusy("merge"); setError(""); setMessage("");
    const response = await fetch("/api/moderation/merge", {
      method: "POST", headers: { "content-type": "application/json", "x-moderator-token": token },
      body: JSON.stringify({ survivingRecordId, mergedRecordId, reason }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error ?? "Nie udało się scalić rekordów.");
    else { setMessage("Scalono rekordy; obie historie źródłowe pozostały przypięte. Scalenie można cofnąć."); setReason(""); await refresh(); }
    setBusy("");
  }

  async function undoMerge(event: MergeHistoryEvent) {
    setBusy(event.id); setError(""); setMessage("");
    const response = await fetch(`/api/moderation/merge/${encodeURIComponent(event.id)}/undo`, { method: "POST", headers: { "x-moderator-token": token } });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error ?? "Nie udało się cofnąć scalenia.");
    else { setMessage("Scalenie cofnięte; przywrócono oba zapisy sprzed decyzji."); await refresh(); }
    setBusy("");
  }

  const sources = queue?.sources ?? [];
  const allRecords = useMemo(() => queue ? [...queue.records, ...queue.pendingRecords] : [], [queue]);
  const byId = useMemo(() => new Map(allRecords.map((record) => [record.id, record])), [allRecords]);
  const publicIds = useMemo(() => new Set((queue?.records ?? []).map((record) => record.id)), [queue?.records]);
  const candidates = useMemo(() => findDuplicateCandidates(allRecords, 30), [allRecords]);
  const pendingPageCount = Math.max(1, Math.ceil((queue?.pendingRecords.length ?? 0) / PENDING_PAGE_SIZE));
  const visiblePending = (queue?.pendingRecords ?? []).slice(pendingPage * PENDING_PAGE_SIZE, (pendingPage + 1) * PENDING_PAGE_SIZE);
  return <>
    <section className="moderator-access">
      <label className="field-label">Klucz moderatora<input type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Wpisz klucz moderatora" /></label>
      <button className="button button-primary" type="button" onClick={() => void refresh()} disabled={!token || busy !== ""}>Otwórz kolejkę</button>
      {demoToken && <small>Klucz lokalnej demonstracji jest wpisany w polu. W środowisku produkcyjnym ustawia się go przez AED_MODERATOR_TOKEN.</small>}
    </section>
    {error && <p className="error-box" role="alert">{error}</p>}{message && <p className="success-inline" role="status">{message}</p>}
    {queue && <>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">ODŚWIEŻANIE ZWERYFIKOWANYCH ADAPTERÓW</p><h2>Pobierz ze źródła</h2><p>Każde pobranie jest zapisywane jako import, a rekordy trafiają do kolejki oczekującej na moderację.</p></div></div>
        <div className="source-list">{AED_SOURCE_CATALOG.map((profile) => <article className="source-card" key={profile.id}>
          <div><strong>{profile.name}</strong><p><a href={profile.catalogUrl} target="_blank" rel="noreferrer">{profile.publisher} · {profile.referenceScope.geographyLabel} ↗</a></p><small>Data danych: {profile.referenceScope.sourceDataDate ?? "bieżący eksport bez osobnej daty"} · {profile.formatLabel} · {profile.licenseId}</small></div>
          <button className="button button-small button-primary" disabled={busy !== ""} onClick={() => void collectSource(profile.id)}>{busy === `collect:${profile.id}` ? "Pobieranie…" : profile.collection.requiresToken ? "Pobierz (wymaga tokenu)" : "Pobierz dane"}</button>
        </article>)}</div>
        <p className="source-import-note">Token API Warszawy, jeśli został przyznany dysponentowi aplikacji, konfiguruje się po stronie serwera jako <code>AED_WARSAW_API_TOKEN</code>. Nie wpisuj sekretu w przeglądarce.</p>
      </section>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">KANDYDACI, NIE AUTOMATYCZNE DUPLIKATY</p><h2>Podobne lokalizacje</h2><p>Odległość jest sygnałem do sprawdzenia. Nie łącz urządzeń bez potwierdzenia u źródła.</p></div></div>
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
      </section>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">LICENCJE I POCHODZENIE</p><h2>Źródła danych <span className="count-pill">{sources.length}</span></h2><p>Najpierw sprawdź warunki ponownego wykorzystania i wymaganą atrybucję.</p></div></div>
        <div className="source-list">{sources.map((source) => <article className="source-card" key={source.id}>
          <div><strong>{source.name}</strong><p><a href={source.url} target="_blank" rel="noreferrer">{source.url} ↗</a></p><small>Licencja: {source.licenseId || "nieznana"} · Oznaczenie: {source.attribution || "brak"} · {source.synthetic ? "zbiór syntetyczny" : "źródło zewnętrzne"}</small></div>
          <span className={`license-status license-${source.licenseReviewStatus}`}>{source.licenseReviewStatus === "approved" ? "Zatwierdzone" : source.licenseReviewStatus === "blocked" ? "Zablokowane" : "Do sprawdzenia"}</span>
          {!source.synthetic && source.licenseReviewStatus !== "approved" && <div className="source-actions">{source.licenseId && source.licenseId !== "unknown" ? <button className="button button-small button-primary" disabled={busy === source.id} onClick={() => void reviewSource(source, "approved")}>Zatwierdź licencję</button> : <span className="license-status license-blocked">Brak identyfikatora licencji — nie można zatwierdzić</span>}<button className="button button-small button-outline" disabled={busy === source.id} onClick={() => void reviewSource(source, "blocked")}>Zablokuj</button></div>}
        </article>)}</div>
      </section>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">PRZEGLĄD REKORD PO REKORDZIE</p><h2>Oczekujące AED <span className="count-pill">{queue.pendingRecords.length}</span></h2><p>Rekord jest publikowany tylko wtedy, gdy wszystkie licencje źródłowe mają zatwierdzony status.</p></div></div>
        <label className="field-label reason-field">Uzasadnienie decyzji (opcjonalne)<input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Np. lokalizacja potwierdzona u dysponenta" /></label>
        {queue.pendingRecords.length === 0 ? <div className="empty-state compact"><strong>Kolejka jest pusta</strong><p>Przesłane pliki pojawią się tutaj po imporcie.</p></div> : <>
          <p className="source-import-note">Wyświetlono {pendingPage * PENDING_PAGE_SIZE + 1}–{Math.min((pendingPage + 1) * PENDING_PAGE_SIZE, queue.pendingRecords.length)} z {queue.pendingRecords.length} rekordów.</p>
          <div className="pending-list">{visiblePending.map((record) => {
          const recordSources = record.sources.map((reference) => sources.find((source) => source.id === reference.sourceId)).filter((source): source is StoredSource => Boolean(source));
          const canApprove = recordSources.length > 0 && recordSources.every((source) => source.licenseReviewStatus === "approved" && (source.synthetic || (source.licenseId && source.licenseId !== "unknown")));
          return <article className="pending-card" key={record.id}><div className="pending-card-heading"><div><span className="eyebrow">REKORD {record.id.slice(0, 8)}</span><h3>{record.name ?? "AED bez nazwy"}</h3></div><span className={canApprove ? "license-status license-approved" : "license-status license-needs_review"}>{canApprove ? "Można rozpatrzyć" : "Najpierw sprawdź licencję"}</span></div>
            <p>{record.address ?? "Brak adresu"} · {record.location.latitude.toFixed(5)}, {record.location.longitude.toFixed(5)}</p>
            <p className="source-inline">Źródło: {recordSources.map((source) => source.name).join(", ") || "nieznane"}. Dostęp: {record.accessType}; stan zgłoszony: {record.operationalStatus}.</p>
            <div className="pending-actions"><button className="button button-primary" disabled={!canApprove || busy === record.id} onClick={() => void reviewRecord(record, "approved")}>Zatwierdź rekord</button><button className="button button-outline" disabled={busy === record.id} onClick={() => void reviewRecord(record, "rejected")}>Odrzuć</button></div>
          </article>;
        })}</div>
          {pendingPageCount > 1 && <nav className="queue-pagination" aria-label="Strony kolejki">
            <button className="button button-small button-outline" disabled={pendingPage === 0} onClick={() => setPendingPage((page) => Math.max(0, page - 1))}>Poprzednia</button>
            <span>Strona {pendingPage + 1} z {pendingPageCount}</span>
            <button className="button button-small button-outline" disabled={pendingPage + 1 >= pendingPageCount} onClick={() => setPendingPage((page) => Math.min(pendingPageCount - 1, page + 1))}>Następna</button>
          </nav>}
        </>}
      </section>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">ŚLAD DECYZJI</p><h2>Ostatnie importy i decyzje</h2></div></div>
        <div className="audit-grid"><article className="audit-card"><h3>Importy</h3>{queue.importRuns.slice(0, 5).map((run) => <p key={run.id}><strong>{sources.find((source) => source.id === run.sourceId)?.name ?? run.sourceId}</strong><small>{new Date(run.fetchedAt).toLocaleString("pl-PL")} · przyjęto {run.importedCount} · odrzucono {run.rejectedCount}</small></p>)}{queue.importRuns.length === 0 && <p>Brak importów.</p>}</article>
          <article className="audit-card"><h3>Decyzje</h3>{queue.decisions.slice(0, 5).map((decision, index) => <p key={`${decision.recordId}-${index}`}><strong>{decision.decision === "approved" ? "Zatwierdzono" : "Odrzucono"} · {decision.recordId.slice(0, 8)}</strong><small>{new Date(decision.decidedAt).toLocaleString("pl-PL")} · {decision.reason || "bez uzasadnienia"}</small></p>)}{queue.decisions.length === 0 && <p>Brak decyzji.</p>}</article></div>
      </section>
      <section className="moderation-section"><div className="section-heading"><div><p className="eyebrow">SCALENIA I COFNIĘCIA</p><h2>Historia łączenia rekordów</h2></div></div>
        {queue.mergeHistory.length === 0 ? <div className="empty-state compact"><strong>Brak decyzji o scaleniu</strong><p>Każde ręczne scalenie będzie można tu cofnąć.</p></div> : <div className="source-list">{queue.mergeHistory.slice(0, 12).map((event) => <article className="source-card" key={event.id}><div><strong>{event.status === "merged" ? "Scalono" : "Cofnięto scalenie"}: {event.survivingRecordId.slice(0, 8)} ← {event.mergedRecordId.slice(0, 8)}</strong><p>{event.reason || "bez uzasadnienia"}</p><small>{new Date(event.undoneAt ?? event.decidedAt).toLocaleString("pl-PL")}</small></div>{event.status === "merged" && <button className="button button-small button-outline" disabled={busy !== ""} onClick={() => void undoMerge(event)}>Cofnij scalenie</button>}</article>)}</div>}
      </section>
    </>}
  </>;
}
