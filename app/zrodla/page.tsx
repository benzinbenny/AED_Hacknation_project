import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SourceCatalog } from "@/components/SourceCatalog";
import { loadAppStore } from "@/storage/repository";

export const metadata: Metadata = { title: "Źródła i zakres danych AED" };

export default async function SourcesPage() {
  const store = await loadAppStore();
  return <>
    <SiteHeader active="/zrodla" />
    <main id="main-content" tabIndex={-1} className="inner-page sources-page">
      <section className="page-intro">
        <p className="eyebrow">POCHODZENIE · ZASIĘG · AKTUALNOŚĆ</p>
        <h1>Źródła danych o AED</h1>
        <p>Zbieramy opublikowane zbiory i udostępniamy ten sam proces przyjmowania danych od kolejnych dysponentów. Przy każdym źródle pokazujemy, kogo obejmuje, jaką datę danych podaje i jakie warunki udostępniania obowiązują.</p>
      </section>
      <SourceCatalog sources={store.sources} importRuns={store.importRuns} />
      <section className="source-next-steps">
        <div><p className="eyebrow">KOLEJNI DYSPONENCI</p><h2>Wspólny format dla każdego źródła</h2><p>Samorząd, placówka lub inna organizacja może przekazać plik CSV albo GeoJSON. Mapowanie kolumn zachowuje oryginalne identyfikatory, a wątpliwe rekordy trafiają do raportu zamiast być poprawiane bez wiedzy dostawcy.</p></div>
        <div className="source-next-actions"><Link className="button button-primary" href="/dodaj">Przekaż dane</Link><Link className="button button-outline" href="/standard">Pobierz wzorzec XLSX</Link></div>
      </section>
      <p className="source-help-links">Materiały dla dostawców: <a href="https://dane.gov.pl/pl/knowledgebase/useful-materials" target="_blank" rel="noreferrer" aria-label="Baza wiedzy dane.gov.pl; otwiera się w nowej karcie">baza wiedzy dane.gov.pl <span aria-hidden="true">↗</span></a> · <a href="https://dane.gov.pl/source-code/" target="_blank" rel="noreferrer" aria-label="Kod źródłowy portalu dane.gov.pl; otwiera się w nowej karcie">kod źródłowy portalu <span aria-hidden="true">↗</span></a></p>
      <p className="source-catalog-limit">To rejestr skonfigurowanych i rozpoznanych zasobów, nie pełna ewidencja wszystkich dysponentów w Polsce. Nowe publikacje dodajemy po sprawdzeniu zasięgu, schematu, dostępu i licencji.</p>
    </main>
    <footer className="site-footer"><span>Punkt Życia · prototyp danych AED</span><span><a href="/">Wróć do katalogu</a><a href="/moderacja">Panel moderacji</a></span></footer>
  </>;
}

