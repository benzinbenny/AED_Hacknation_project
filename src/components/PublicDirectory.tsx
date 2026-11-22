"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import type { AedRecord } from "../domain/types";
import type { StoredSource } from "../services/staging";
import { SiteHeader } from "./SiteHeader";

const AedMap = dynamic(() => import("./AedMap").then((module) => module.AedMap), {
  ssr: false,
  loading: () => <div className="map-placeholder">Ładowanie mapy… Lista AED jest już dostępna poniżej.</div>,
});

const accessLabels = {
  public: "Dostęp publiczny",
  customers: "Dla klientów / użytkowników obiektu",
  restricted: "Dostęp ograniczony",
  private: "Dostęp prywatny",
  unknown: "Dostęp nieznany",
} as const;
const statusLabels = {
  reported_operational: "Zgłoszono jako sprawny",
  reported_out_of_service: "Zgłoszono niedostępność",
  unknown: "Stan niepotwierdzony",
} as const;

function resultNoun(count: number): string {
  if (count === 1) return "wynik";
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return "wyniki";
  return "wyników";
}

export function PublicDirectory({ records, sources }: { records: AedRecord[]; sources: StoredSource[] }) {
  const [query, setQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState("all");
  const [view, setView] = useState<"list" | "map">("list");
  const [page, setPage] = useState(0);
  const sourcesById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const allRecordsSynthetic = records.length > 0 && records.every((record) => record.sources.every((source) => sourcesById.get(source.sourceId)?.synthetic === true));
  const filtered = useMemo(() => records.filter((record) => {
    if (record.recordStatus === "removed" || record.recordStatus === "temporarily_removed") return false;
    const text = [record.name, record.address, record.locationDescription, record.operatorName].filter(Boolean).join(" ").toLocaleLowerCase("pl-PL");
    return text.includes(query.trim().toLocaleLowerCase("pl-PL")) && (accessFilter === "all" || record.accessType === accessFilter);
  }), [records, query, accessFilter]);
  const pageSize = 30;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * pageSize;

  return <>
    <SiteHeader />
    <main id="main-content" tabIndex={-1}>
      <section className="hero directory-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> Otwarte dane. Lepsza gotowość.</p>
          <h1>Wiedzieć, gdzie jest AED.<br /><em>Pomóc szybciej.</em></h1>
          <p className="hero-lead">Punkt Życia porządkuje dane o defibrylatorach z wielu źródeł. Pokazujemy, skąd pochodzą informacje i czego jeszcze nie udało się potwierdzić.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#lista-aed">Przeglądaj punkty <span aria-hidden="true">↓</span></a>
            <Link className="button button-outline" href="/dodaj">Mam dane do dodania</Link>
          </div>
          <p className="urgent-note"><strong>W nagłym wypadku:</strong> dzwoń pod 112. Ta demonstracja nie jest źródłem informacji operacyjnej.</p>
        </div>
        <aside className="hero-stat" aria-label={allRecordsSynthetic ? "Informacja o danych demonstracyjnych" : "Informacja o danych po moderacji"}>
          <div className="stat-icon" aria-hidden="true">✳</div>
          <p className="stat-kicker">Prototyp konkursowy</p>
          <strong>{records.length.toString().padStart(2, "0")}</strong>
          <span>{allRecordsSynthetic ? "syntetyczne punkty testowe" : "rekordy ze źródeł po moderacji"}</span>
          <div className="stat-rule" />
          <p>{allRecordsSynthetic ? "Każdy rekord na tej stronie jest fikcyjny. Nie prowadź do niego osób potrzebujących pomocy." : "Pochodzenie, licencję i datę pobrania sprawdzisz przy każdym rekordzie. Nie traktuj katalogu jako informacji operacyjnej."}</p>
        </aside>
      </section>

      <section className="notice-band" aria-label="Ważna informacja o danych">
        <span className="notice-icon" aria-hidden="true">!</span>
        <p>{allRecordsSynthetic ? <><strong>To dane demonstracyjne, nie mapa rzeczywistych defibrylatorów.</strong> Dostępność i stan urządzenia wymagają potwierdzenia u dysponenta. Harmonogram 24/7 nie oznacza, że urządzenie jest teraz sprawne.</> : <><strong>To dane źródłowe po licencyjnej kontroli i moderacji, nie mapa operacyjna.</strong> Dostępność i stan urządzenia wymagają potwierdzenia u dysponenta. Harmonogram 24/7 nie oznacza, że urządzenie jest teraz sprawne.</>}</p>
        <Link href="/standard">Jak czytać te dane <span aria-hidden="true">→</span></Link>
      </section>

      <section id="lista-aed" className="directory-section">
        <div className="section-heading">
          <div><p className="eyebrow">PRZEGLĄDAJ DANE</p><h2>Znajdź punkt AED</h2><p>Wyszukuj po nazwie lub opisie. Zawsze sprawdź dostęp do obiektu.</p></div>
          <div className="view-switch" role="group" aria-label="Sposób prezentacji">
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>☷ <span>Lista</span></button>
            <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>◎ <span>Mapa</span></button>
          </div>
        </div>
        <div className="search-row">
          <label className="search-field"><span aria-hidden="true">⌕</span><span className="visually-hidden">Szukaj AED</span><input value={query} onChange={(event) => { setPage(0); setQuery(event.target.value); }} placeholder="Np. budynek, adres, operator" /></label>
          <label className="filter-field"><span className="visually-hidden">Filtruj według dostępu</span><select value={accessFilter} onChange={(event) => { setPage(0); setAccessFilter(event.target.value); }}>
            <option value="all">Każdy typ dostępu</option><option value="public">Publiczny</option><option value="customers">Dla użytkowników</option><option value="restricted">Ograniczony</option><option value="unknown">Nieznany</option>
          </select></label>
          <span className="result-count">{filtered.length} {resultNoun(filtered.length)}</span>
        </div>
        {view === "map" && <AedMap records={filtered} synthetic={allRecordsSynthetic} />}
        <div className="record-list" aria-live="polite">
          {filtered.slice(start, start + pageSize).map((record, index) => {
            const source = record.sources[0];
            const synthetic = source ? sourcesById.get(source.sourceId)?.synthetic : true;
            const stateClass = record.operationalStatus === "reported_out_of_service" ? "status-warn" : "status-neutral";
            return <article className="record-card" key={record.id}>
              <div className="record-index">{String(start + index + 1).padStart(2, "0")}</div>
              <div className="record-main">
                <div className="record-title-row"><h3>{record.name ?? "Punkt AED — nazwa nieznana"}</h3><span className="badge badge-demo">{synthetic ? "Dane syntetyczne" : "Dane źródłowe"}</span></div>
                <p className="record-address">{record.address ?? "Adres nie został podany"}{record.locationDescription ? ` · ${record.locationDescription}` : ""}</p>
                <div className="record-tags"><span className="tag">{accessLabels[record.accessType]}</span><span className={`tag ${stateClass}`}>{statusLabels[record.operationalStatus]}</span></div>
              </div>
              <div className="record-meta"><span>Weryfikacja</span><strong>{record.lastVerifiedAt ? new Date(record.lastVerifiedAt).toLocaleDateString("pl-PL") : "Brak potwierdzenia"}</strong><small>Źródło: {source?.attribution ?? "nieznane"}</small></div>
              <details className="record-details"><summary>Szczegóły i pochodzenie</summary><dl>
                <dt>Dostęp</dt><dd>{accessLabels[record.accessType]}. {record.availability.rawHours ? `Wartość źródłowa godzin: ${record.availability.rawHours}.` : "Brak godzin w źródle."}</dd>
                <dt>Status</dt><dd>{statusLabels[record.operationalStatus]}; zgłoszenie nie zastępuje bieżącej kontroli.</dd>
                <dt>Identyfikator źródłowy</dt><dd>{source?.sourceRecordId ?? "nieznany"}</dd>
                {source?.upstreamSourceId ? <><dt>Zewnętrzny identyfikator źródła</dt><dd>{source.upstreamSourceId}</dd></> : null}
                <dt>Ostatni import</dt><dd>{source ? new Date(source.fetchedAt).toLocaleString("pl-PL") : "nieznany"}</dd>
                <dt>Licencja</dt><dd>{source?.licenseId ?? "nieznana"}</dd>
                {record.localCorrection && <><dt>Korekta administratora</dt><dd>{new Date(record.localCorrection.updatedAt).toLocaleString("pl-PL")}</dd></>}
                {record.sources.filter((ref) => ref.sourceId === "osm-pl").map((ref) =>
                  <Fragment key={ref.sourceRecordId}>
                    <dt>Obiekt OpenStreetMap</dt><dd><a href={`https://www.openstreetmap.org/${ref.sourceRecordId}`}>{ref.sourceRecordId}</a>
                      {!ref.sourceRecordId.startsWith("node/") && " · współrzędne przybliżone (środek obwiedni obiektu)"}</dd>
                  </Fragment>)}
                {record.sources.length > 1 ? <><dt>Wszystkie źródła</dt><dd>{record.sources.map((reference) => `${sourcesById.get(reference.sourceId)?.name ?? reference.sourceId} · ${reference.sourceRecordId} · ${reference.licenseId ?? "licencja nieznana"}`).join(" | ")}</dd></> : null}
              </dl></details>
            </article>;
          })}
          {filtered.length === 0 && <div className="empty-state"><span aria-hidden="true">⌕</span><strong>Nie znaleźliśmy takich punktów</strong><p>Zmień frazę lub typ dostępu.</p></div>}
        </div>
      {pages > 1 && <nav className="queue-pagination" aria-label="Strony katalogu AED">
        <button className="button button-outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Poprzednia</button>
        <span>Strona {currentPage + 1} z {pages}</span>
        <button className="button button-outline" disabled={currentPage + 1 === pages} onClick={() => setPage(currentPage + 1)}>Następna</button>
      </nav>}
      </section>
      <section className="contribute-band">
        <div><p className="eyebrow">MASZ DANE O AED?</p><h2>Pomóż uzupełnić obraz.</h2><p>Dodaj plik CSV, GeoJSON albo wzorcowy XLSX. Najpierw sprawdzimy format, pochodzenie i licencję; rekordy trafią do kolejki weryfikacji.</p></div>
        <Link href="/dodaj" className="button button-light">Dodaj zestaw danych <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
    <footer className="site-footer"><span>© Punkt Życia · Prototyp konkursowy</span><span><Link href="/standard">Standard danych</Link><Link href="/kampania">O misji</Link><a href="https://dane.gov.pl/pl/knowledgebase/useful-materials" target="_blank" rel="noreferrer" aria-label="Materiały dane.gov.pl; otwiera się w nowej karcie">Materiały dane.gov.pl <span aria-hidden="true">↗</span></a></span></footer>
  </>;
}
