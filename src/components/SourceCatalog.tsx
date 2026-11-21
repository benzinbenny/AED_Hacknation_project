import { AED_SOURCE_CATALOG } from "../sources/catalog";
import { assessSourceFreshness } from "../sources/freshness";
import type { SourceReferenceScope } from "../domain/types";
import type { ImportRun, StoredSource } from "../services/staging";

function localDate(value: string | undefined): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Warsaw" }).format(new Date(value));
}

function unknownScope(): SourceReferenceScope {
  return {
    geographyLabel: "Nie podano przez dysponenta",
    geographyLevel: "unknown",
    temporalDescription: "Nie podano okresu danych u źródła.",
    sourceDataDate: null,
    updateFrequency: "Nie podano częstotliwości aktualizacji",
    basis: "unverified",
    limitations: "Nie podano; wymaga sprawdzenia u dysponenta.",
  };
}

export function SourceCatalog({ sources, importRuns }: { sources: StoredSource[]; importRuns: ImportRun[] }) {
  const knownSourceIds = new Set(AED_SOURCE_CATALOG.map((source) => source.id));
  const contributedSources = sources.filter((source) => !knownSourceIds.has(source.id));
  const configuredSourceIds = AED_SOURCE_CATALOG.map((source) => source.id);
  const nationalSources = AED_SOURCE_CATALOG.filter((source) => source.referenceScope.geographyLevel === "country").length;
  const localSources = AED_SOURCE_CATALOG.length - nationalSources;
  const latestCollection = importRuns[0]?.fetchedAt;
  return <>
    <section className="source-health-board" aria-labelledby="source-health-title">
      <div className="source-health-intro">
        <p className="eyebrow">POKRYCIE · ŚWIEŻOŚĆ · OTWARTY PROCES</p>
        <h2 id="source-health-title">Co wiemy o zasięgu źródeł</h2>
        <p>Pokazujemy zakres deklarowany przez dysponenta oraz stan pobrania do tej aplikacji. To mapa odpowiedzialności za dane, a nie deklaracja kompletności krajowego rejestru AED.</p>
      </div>
      <dl className="source-health-summary">
        <div><dt>{configuredSourceIds.length}</dt><dd>skonfigurowanych profili źródeł</dd></div>
        <div><dt>{nationalSources}</dt><dd>źródło z zakresem krajowym</dd></div>
        <div><dt>{localSources}</dt><dd>źródła z zakresem lokalnym</dd></div>
        <div><dt>{contributedSources.length}</dt><dd>źródeł przekazanych przez organizacje</dd></div>
      </dl>
      <p className="source-health-footnote">{latestCollection ? `Ostatnie pobranie do aplikacji: ${localDate(latestCollection)}.` : "Nie uruchomiono jeszcze pobrania konektorów w tej kopii aplikacji."} Status pobrania nie jest oceną stanu technicznego defibrylatora.</p>
    </section>
    <section className="source-catalog-grid" aria-label="Skonfigurowane źródła danych AED">
      {AED_SOURCE_CATALOG.map((profile) => {
        const stored = sources.find((source) => source.id === profile.id);
        const latestRun = importRuns.find((run) => run.sourceId === profile.id);
        const referenceScope = stored?.referenceScope ?? profile.referenceScope;
        const sourceDate = referenceScope.sourceDataDate ?? "niepodana";
        const freshness = assessSourceFreshness(referenceScope, latestRun?.fetchedAt);

        return <article className="source-profile-card" key={profile.id}>
          <div className="source-profile-heading">
            <div><p className="eyebrow">{referenceScope.geographyLevel === "country" ? "ZASIĘG KRAJOWY" : "ZASIĘG LOKALNY"}</p><h2>{profile.name}</h2></div>
            <div className="source-badges"><span className={profile.collection.requiresToken ? "source-availability source-locked" : "source-availability source-ready"}>{profile.collection.requiresToken ? "Wymaga tokenu" : "Konektor dostępny"}</span><span className={`source-freshness source-freshness-${freshness.status}`} title={freshness.description}>{freshness.label}</span></div>
          </div>
          <p className="source-publisher"><strong>Dysponent:</strong> {profile.publisher}</p>
          <dl className="source-scope-details">
            <div><dt>Zakres przestrzenny</dt><dd>{referenceScope.geographyLabel}</dd></div>
            <div><dt>Zakres czasowy / data danych</dt><dd>{referenceScope.temporalDescription} Data zasobu: {sourceDate}.</dd></div>
            <div><dt>Częstotliwość z metadanych</dt><dd>{referenceScope.updateFrequency}</dd></div>
            <div><dt>Format i licencja</dt><dd>{profile.formatLabel} · {stored?.licenseId ?? profile.licenseId}</dd></div>
            <div><dt>Pochodzenie</dt><dd>{profile.upstreamOrigin}; oznaczenie: {stored?.attribution ?? profile.attribution}</dd></div>
            <div><dt>Ograniczenia</dt><dd>{referenceScope.limitations}</dd></div>
            <div><dt>Pobranie w tej aplikacji</dt><dd>{latestRun ? `${localDate(latestRun.fetchedAt)} · przyjęto ${latestRun.importedCount}, odrzucono ${latestRun.rejectedCount}, ostrzeżeń ${latestRun.warningCount}` : "Jeszcze nie pobrano do aplikacji."}</dd></div>
            <div><dt>Stan pozyskania</dt><dd>{freshness.description}</dd></div>
          </dl>
          <a className="source-profile-link" href={profile.catalogUrl} target="_blank" rel="noreferrer" aria-label={`Otwórz publikację źródłową ${profile.name}; otwiera się w nowej karcie`}>Otwórz publikację źródłową <span aria-hidden="true">↗</span></a>
        </article>;
      })}
    </section>
    {contributedSources.length > 0 && <section className="submitted-sources" aria-label="Źródła przekazane przez organizacje">
      <div className="section-heading"><div><p className="eyebrow">REJESTR ROZSZERZANY PRZEZ DYSPONENTÓW</p><h2>Źródła przekazane przez organizacje <span className="count-pill">{contributedSources.length}</span></h2><p>Każdy dysponent może dołączyć do wspólnego zbioru plikiem CSV, GeoJSON lub wzorcowym XLSX i opisać zakres swojej publikacji.</p></div></div>
      <div className="source-catalog-grid">{contributedSources.map((source) => {
        const scope = source.referenceScope ?? unknownScope();
        const latestRun = importRuns.find((run) => run.sourceId === source.id);
        const freshness = assessSourceFreshness(scope, latestRun?.fetchedAt);
        return <article className="source-profile-card" key={source.id}>
          <div className="source-profile-heading"><div><p className="eyebrow">{source.synthetic ? "ŹRÓDŁO DEMONSTRACYJNE" : "ZGŁOSZONE PRZEZ DYSPONENTA"}</p><h2>{source.name}</h2></div><span className={`license-status license-${source.licenseReviewStatus}`}>{source.licenseReviewStatus === "approved" ? "Licencja zatwierdzona" : source.licenseReviewStatus === "blocked" ? "Zablokowane" : "Licencja do sprawdzenia"}</span></div>
          <p className="source-publisher"><strong>Pierwotne źródło:</strong> {source.upstreamOrigin}</p>
          <dl className="source-scope-details">
            <div><dt>Zakres przestrzenny</dt><dd>{scope?.geographyLabel ?? "Nie podano"} · poziom: {scope?.geographyLevel ?? "unknown"}</dd></div>
            <div><dt>Zakres czasowy / data danych</dt><dd>{scope?.temporalDescription ?? "Nie podano"} · data: {scope?.sourceDataDate ?? "nieznana"}</dd></div>
            <div><dt>Częstotliwość i podstawa</dt><dd>{scope?.updateFrequency ?? "Nie podano"} · {scope?.basis ?? "unverified"}</dd></div>
            <div><dt>Licencja i atrybucja</dt><dd>{source.licenseId} · {source.attribution || "niepodana"}</dd></div>
            <div><dt>Ograniczenia</dt><dd>{scope?.limitations ?? "Nie podano; wymaga sprawdzenia u dysponenta."}</dd></div>
            <div><dt>Ostatni import</dt><dd>{latestRun ? `${localDate(latestRun.fetchedAt)} · przyjęto ${latestRun.importedCount}, odrzucono ${latestRun.rejectedCount}` : "Nie pobrano jeszcze danych."}</dd></div>
            <div><dt>Stan pozyskania</dt><dd><span className={`source-freshness source-freshness-${freshness.status}`} title={freshness.description}>{freshness.label}</span> {freshness.description}</dd></div>
          </dl>
          <a className="source-profile-link" href={source.url} target="_blank" rel="noreferrer" aria-label={`Otwórz stronę źródła ${source.name}; otwiera się w nowej karcie`}>Otwórz stronę źródła <span aria-hidden="true">↗</span></a>
        </article>;
      })}</div>
    </section>}
    <aside className="source-scope-note">
      <strong>Zakres referencyjny opisuje publikację, nie gwarantuje jej kompletności.</strong>
      <span>Data pobrania nie jest datą potwierdzenia AED. Widoki OpenAEDMap i Geoportalu mogą pochodzić z tych samych danych OpenStreetMap, więc nie liczymy ich jako niezależnych potwierdzeń. Każdy nowy rekord trafia do moderacji.</span>
    </aside>
  </>;
}

