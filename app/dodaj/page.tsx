import type { Metadata } from "next";
import { UploadWizard } from "@/components/UploadWizard";
import { SiteHeader } from "@/components/SiteHeader";
import "./submission.css";

export const metadata: Metadata = { title: "Dodaj dane" };

export default function AddDataPage() {
  return <><SiteHeader active="/dodaj" /><main id="main-content" tabIndex={-1} className="inner-page">
    <div className="page-intro"><h1>Dodaj dane o AED</h1><p>Wpisz informacje o jednym urządzeniu lub prześlij plik z wieloma lokalizacjami. Zgłoszenia trafiają do administratora.</p></div>
    <UploadWizard />
    <aside className="side-note"><strong>Nie wysyłaj danych osobowych.</strong><span>W pliku powinny być wyłącznie dane o lokalizacjach AED, pochodzeniu zbioru i dostępności. Nie dodawaj nazwisk, prywatnych numerów telefonu ani informacji o zgłaszających.</span></aside>
  </main><SiteFooter /></>;
}

function SiteFooter() { return <footer className="site-footer"><span>© Punkt Życia · Prototyp konkursowy</span><span><a href="https://dane.gov.pl/pl/knowledgebase/useful-materials" target="_blank" rel="noreferrer" aria-label="Materiały dane.gov.pl; otwiera się w nowej karcie">Materiały dane.gov.pl <span aria-hidden="true">↗</span></a></span></footer>; }
