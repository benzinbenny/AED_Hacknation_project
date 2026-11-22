import { useEffect, useState } from "react";
import { AED_SOURCE_CATALOG } from "../../sources/catalog";
import type { ImportRun, StoredSource } from "../../services/staging";
import type { AedRecord } from "../../domain/types";
import { SourceInstallationAction } from "./SourceInstallationAction";

export function SourceInventory({ sources, runs, removed, deleted, forgotten, discoveryVersion, records, pending, canManage, busy, collect, change, remove, purge, requestAdmin }: {
  sources: StoredSource[]; runs: ImportRun[]; removed: string[]; deleted: string[]; forgotten: string[]; discoveryVersion: number; records: AedRecord[]; pending: AedRecord[]; canManage: boolean; busy: boolean;
  collect: (id: string) => Promise<void>; change: (id: string, installed: boolean) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  purge: (id: string) => Promise<void>;
  requestAdmin: () => void;
}) {
  const [view, setView] = useState<"installed" | "available" | "deleted">("installed");
  const [confirm, setConfirm] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => { if (discoveryVersion > 0) { setView("available"); setSearch(""); } }, [discoveryVersion]);
  const profiles = AED_SOURCE_CATALOG.map((p) => ({ id: p.id, name: p.name, subtitle: p.referenceScope.geographyLabel, url: p.catalogUrl, type: p.formatLabel, connector: true, locked: p.collection.requiresToken }));
  const files = sources.filter((s) => !profiles.some((p) => p.id === s.id))
    .map((s) => ({ id: s.id, name: s.name, subtitle: s.referenceScope?.geographyLabel ?? s.upstreamOrigin, url: s.url, type: s.datasetId ? "Zbiór dane.gov.pl" : s.synthetic ? "Dane demonstracyjne" : "Import plikowy", connector: Boolean(s.datasetId), locked: false }));
  const all = [...profiles, ...files].filter((item) => !forgotten.includes(item.id));
  const installed = all.filter((s) => !removed.includes(s.id) && !deleted.includes(s.id));
  const available = all.filter((s) => removed.includes(s.id) && !deleted.includes(s.id));
  const deletedItems = all.filter((s) => deleted.includes(s.id));
  const items = (view === "deleted" ? deletedItems : view === "available" ? available : installed).filter((item) => [item.name, item.subtitle, item.type].some((value) => value.toLocaleLowerCase("pl").includes(search.trim().toLocaleLowerCase("pl"))));
  return <>
    <label className="field-label reason-field">Szukaj źródła<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nazwa, obszar lub format" /></label>
    <div className="inventory-filter" role="group" aria-label="Stan instalacji">
      <button type="button" aria-pressed={view === "installed"} onClick={() => { setView("installed"); setConfirm(""); }}>Zainstalowane źródła ({installed.length})</button>
      <button type="button" aria-pressed={view === "available"} onClick={() => { setView("available"); setConfirm(""); }}>Do zainstalowania ({available.length})</button>
      <button type="button" aria-pressed={view === "deleted"} onClick={() => { setView("deleted"); setConfirm(""); }}>Usunięte źródła ({deletedItems.length})</button>
    </div>
    <div className="inventory-grid">{items.map((item) => {
      const run = runs.find((r) => r.sourceId === item.id);
      const approvedCount = records.filter((record) => record.sources.some((source) => source.sourceId === item.id)).length;
      const pendingCount = pending.filter((record) => record.sources.some((source) => source.sourceId === item.id)).length;
      return <article key={item.id} className="inventory-card">
        <span className="inventory-format">{item.type}</span><h3>{item.name}</h3><p>{item.subtitle}</p>
        <small>{run ? `Ostatni import: ${new Date(run.fetchedAt).toLocaleString("pl-PL")} · ${run.importedCount} wpisów` : "Brak importów z tego źródła"}</small>
        <a href={item.url} target="_blank" rel="noreferrer">Publikacja źródłowa ↗</a>
        <div className="inventory-actions">
          {item.connector && view === "installed" && <button className="button button-primary" disabled={busy} onClick={() => void collect(item.id)}>{item.locked ? "Pobierz (wymaga tokenu)" : "Pobierz dane"}</button>}
          {view === "deleted" ? <button type="button" className="button button-danger" disabled={busy} onClick={() => setConfirm(item.id)}>Usuń trwale</button> : <>
            {confirm !== item.id && <SourceInstallationAction id={item.id} name={item.name} installed={view === "installed"} busy={busy} canManage={canManage} requestAdmin={requestAdmin} change={async (id, install) => { if (await change(id, install)) setView(install ? "installed" : "available"); }} />}
            {confirm !== item.id && <button type="button" className="button button-danger" disabled={busy} onClick={() => setConfirm(item.id)}>Usuń źródło</button>}
          </>}
        </div>
        {confirm === item.id && view === "deleted" && <div className="warning-box" role="group" aria-label="Potwierdź trwałe usunięcie">
          <p>Usunąć „{item.name}” z listy usuniętych źródeł? Wyszukiwanie może znaleźć je ponownie.</p>
          <div className="inventory-actions"><button type="button" className="button button-outline" disabled={busy} onClick={() => setConfirm("")}>Anuluj</button><button type="button" className="button button-danger" disabled={busy} onClick={async () => { await purge(item.id); setConfirm(""); }}>Potwierdź trwałe usunięcie</button></div>
        </div>}
        {confirm === item.id && view !== "deleted" && <div className="warning-box" role="group" aria-label="Potwierdź usunięcie źródła">
          <p>Usunąć „{item.name}” oraz powiązane AED? Bezpośrednio powiązane: {approvedCount} zatwierdzonych i {pendingCount} oczekujących. Usunięte zostaną również powiązane wpisy po scaleniu, także jeśli mają inne źródła.</p>
          <p>Źródło trafi do zakładki usuniętych. Wpisy nie wrócą automatycznie.</p>
          <div className="inventory-actions"><button type="button" className="button button-outline" disabled={busy} onClick={() => setConfirm("")}>Anuluj</button><button type="button" className="button button-danger" disabled={busy} onClick={async () => { if (await remove(item.id)) { setConfirm(""); setSearch(""); setView("deleted"); } }}>Potwierdź usunięcie źródła i AED</button></div>
        </div>}
      </article>;
    })}</div>
    {!items.length && <p className="empty-state compact">{search.trim() ? "Brak źródeł pasujących do wyszukiwania." : view === "deleted" ? "Brak usuniętych źródeł." : view === "available" ? "Wszystkie dostępne źródła są zainstalowane." : "Brak zainstalowanych źródeł."}</p>}
  </>;
}
