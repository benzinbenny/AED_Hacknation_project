import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Standard danych AED" };

const dictionaries = [
  ["Typ dostępu", "public · customers · restricted · private · unknown", "Opisuje zasady dostępu do lokalizacji, nie stan urządzenia."],
  ["Położenie administracyjne", "country_code · voivodeship · county · municipality · locality · postal_code · TERYT TERC/SIMC", "Kod TERYT jest tekstem, aby zachować zera wiodące. Brak kodu nie blokuje zgłoszenia."],
  ["Umiejscowienie", "indoor: yes · no · unknown; floor; entrance_description", "Opisuje, gdzie znaleźć AED i jak do niego dotrzeć."],
  ["Godziny dostępu", "wartość źródłowa", "Zachowujemy oryginalny zapis. Harmonogram nie jest potwierdzeniem, że AED działa."],
  ["Weryfikacja", "location · access · operational_status · full · unknown", "Zakres, wykonawca, metoda i data są osobne od daty pobrania danych."],
  ["Zgłoszony stan", "reported_operational · reported_out_of_service · unknown", "Stan ma autora i datę źródłową. Brak informacji to unknown."],
  ["Status rekordu", "active · temporarily_removed · removed · unknown", "Opisuje status wpisu w zbiorze, odrębnie od stanu urządzenia."],
  ["Pochodzenie", "źródło · ID rekordu · data danych · pobranie · licencja · atrybucja", "Każda obserwacja wskazuje źródło; data zasobu jest oddzielona od czasu pobrania."],
  ["Zakres referencyjny", "geografia · okres · data · częstotliwość · podstawa · ograniczenia", "Opisuje publikację dysponenta; nie gwarantuje kompletności ani aktualności AED."],
] as const;

export default function StandardPage() {
  return <><SiteHeader active="/standard" /><main id="main-content" tabIndex={-1} className="inner-page standard-page">
    <div className="page-intro"><p className="eyebrow">WSPÓLNY JĘZYK DANYCH</p><h1>Jedno urządzenie.<br /><em>Jasne zasady opisu.</em></h1><p>Wspólny model pozwala łączyć rejestry, ale nie zaciera różnic między tym, co wie źródło, a tym, co udało się zweryfikować.</p></div>
    <div className="standard-actions"><a className="button button-primary" href="/api/standard">Pobierz szablon XLSX <span aria-hidden="true">↓</span></a><a className="button button-outline" href="/api/export/csv">Eksport publiczny CSV</a><a className="button button-outline" href="/api/export/geojson">Eksport publiczny GeoJSON</a><a className="button button-outline" href="/api/metadata">Metadane JSON-LD</a></div>
    <div className="standard-callout"><div className="notice-icon" aria-hidden="true">i</div><div><strong>W tym prototypie publiczne eksporty wymagają zgody na licencję.</strong><p>Dane syntetyczne nie trafiają do standardowego eksportu. Po imporcie moderator musi potwierdzić licencję źródła i zatwierdzić każdy rekord.</p></div></div>
    <section className="standard-section"><p className="eyebrow">SŁOWNIKI I POLECENIA</p><h2>Co oznaczają pola</h2><div className="dictionary-table-wrap" role="region" tabIndex={0} aria-label="Tabela słowników i zasad danych AED"><table className="dictionary-table"><thead><tr><th>Pole</th><th>Dozwolone wartości</th><th>Znaczenie</th></tr></thead><tbody>{dictionaries.map(([name, values, description]) => <tr key={name}><th scope="row">{name}</th><td><code>{values}</code></td><td>{description}</td></tr>)}</tbody></table></div></section>
    <section className="principle-grid"><article><span>01</span><h3>Nie zgadujemy</h3><p>Brak danych zapisujemy jako <code>unknown</code>. Nie zakładamy, że urządzenie jest sprawne, dostępne ani publiczne.</p></article><article><span>02</span><h3>Nie spłaszczamy dostępu</h3><p>Godziny otwarcia, dostępność według harmonogramu i zgłoszony stan AED to osobne informacje.</p></article><article><span>03</span><h3>Nie łączymy automatycznie</h3><p>Podobne punkty są kandydatami do sprawdzenia. Dwa AED w jednym budynku mogą być prawdziwe.</p></article><article><span>04</span><h3>Pokazujemy źródło</h3><p>Identyfikator, datę danych, zakres publikacji i czas pobrania pozwalają odtworzyć pochodzenie wpisu.</p></article></section>
    <section className="standard-section format-section"><p className="eyebrow">OTWARTE FORMATY</p><h2>Do publikacji i ponownego użycia</h2><p>Pliki CSV, JSON i GeoJSON zachowują identyfikatory źródeł, licencję, atrybucję, zgłoszony status i datę pobrania. Metadane JSON-LD opisują paczkę publikacyjną i dostępne dystrybucje. CSV stosuje zabezpieczenie komórek przed wstrzyknięciem formuł.</p><p>To narzędzie przygotowuje paczkę danych. Nie publikuje jej bezpośrednio w portalu dane.gov.pl; publikacja wymaga konta i uprawnień podmiotu.</p><p className="external-link-row"><a href="https://dane.gov.pl/source-code/" target="_blank" rel="noreferrer" aria-label="Otwarty kod dane.gov.pl; otwiera się w nowej karcie">Otwarty kod dane.gov.pl <span aria-hidden="true">↗</span></a><a href="https://dane.gov.pl/pl/knowledgebase/useful-materials" target="_blank" rel="noreferrer" aria-label="Materiały i baza wiedzy dane.gov.pl; otwiera się w nowej karcie">Materiały i baza wiedzy <span aria-hidden="true">↗</span></a></p><Link href="/dodaj" className="text-link">Dodaj zestaw do walidacji →</Link></section>
  </main><footer className="site-footer"><span>Wzorcowy zakres danych AED · Wersja 0.2</span><span><Link href="/">Powrót do katalogu</Link></span></footer></>;
}
