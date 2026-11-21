import type { Metadata } from "next";
import { UploadWizard } from "@/components/UploadWizard";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Dodaj dane" };

export default function AddDataPage() {
  return <><SiteHeader active="/dodaj" /><main id="main-content" tabIndex={-1} className="inner-page">
    <div className="page-intro"><p className="eyebrow">WSPÓŁTWÓRZ ZBIÓR</p><h1>Dodaj dane o AED</h1><p>Prześlij tabelę CSV, plik GeoJSON albo wypełniony wzorcowy XLSX. Sprawdzimy punkty, zachowamy pochodzenie i pokażemy problemy przed moderacją.</p></div>
    <ol className="workflow-steps" aria-label="Etapy dodawania danych"><li className="step-active" aria-current="step"><b>1</b> Plik i źródło</li><i aria-hidden="true" /><li><b>2</b> Walidacja</li><i aria-hidden="true" /><li><b>3</b> Weryfikacja</li></ol>
    <UploadWizard />
    <aside className="side-note"><strong>Nie wysyłaj danych osobowych.</strong><span>W pliku powinny być wyłącznie dane o lokalizacjach AED, pochodzeniu zbioru i dostępności. Nie dodawaj nazwisk, prywatnych numerów telefonu ani informacji o zgłaszających.</span></aside>
  </main><SiteFooter /></>;
}

function SiteFooter() { return <footer className="site-footer"><span>© Punkt Życia · Prototyp konkursowy</span><span><a href="https://dane.gov.pl/pl/knowledgebase/useful-materials" target="_blank" rel="noreferrer" aria-label="Materiały dane.gov.pl; otwiera się w nowej karcie">Materiały dane.gov.pl <span aria-hidden="true">↗</span></a></span></footer>; }
