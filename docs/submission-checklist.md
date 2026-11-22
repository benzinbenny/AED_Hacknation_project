# Lista przekazania konkursowego — Punkt Życia

Stan przygotowania: 21 listopada 2026 r. Lista rozróżnia artefakty gotowe do złożenia od elementów, które przed publicznym wdrożeniem wymagają decyzji organizacyjnej lub audytu.

| Wymaganie | Dowód w projekcie | Stan |
|---|---|---|
| Szczegółowy opis i tytuł projektu | `README.md`, `docs/architecture-decisions.md`, `docs/requirements-matrix.md` | Gotowe |
| Prezentacja, minimum 5 slajdów i zrzuty ekranu | `artifacts/presentation/Punkt-Zycia-Misja-AED.pptx`, folder `artifacts/screenshots/` | Gotowe: 8 slajdów; zrzuty są generowane przez test przeglądarkowy |
| Opis funkcjonalności i kroki użytkownika | `docs/demo-script.md`, kampania `/kampania` | Gotowe |
| Lista ograniczeń | `README.md`, `docs/security-accessibility.md`, `docs/requirements-matrix.md` | Gotowe; bez deklaracji kompletności krajowej, live-statusu AED ani bezpośredniego zapisu do dane.gov.pl |
| Prototyp rozwiązania | aplikacja Next.js; `npm run dev` | Gotowe |
| Wzorcowy zakres danych w XLSX | `artifacts/submission/Punkt-Zycia-standard-danych-AED.xlsx`, także `/api/standard` | Gotowe — wersja 0.2; zakładka importowa `Dane_AED` |
| Kod źródłowy | katalog projektu, `src/`, `app/`, `e2e/` | Gotowe |
| Logotyp: JPG, PNG, PDF i format otwarty | `artifacts/brand/punkt-zycia-logo.jpg`, `.png`, `.pdf`, `.svg` | Gotowe |
| Księga znaku PDF | `artifacts/brand/brandbook-punkt-zycia.pdf` | Gotowe |
| Format maszynowo odczytywalny | CSV, GeoJSON, JSON, XLSX i JSON-LD/DCAT | Gotowe; PDF jest użyty wyłącznie dla identyfikacji wizualnej i księgi znaku |
| Zasady dane.gov.pl | pochodzenie, licencja, atrybucja, zakres, aktualność, eksport i JSON-LD | Gotowe w prototypie; publikację wykonuje uprawniony wydawca w oficjalnym procesie |
| WCAG, responsywność i UX | link pomijania treści, fokus, mapa z alternatywą listową, `e2e/accessibility.spec.ts` | Automatyczna weryfikacja wykonana; manualny audyt WCAG 2.2 AA pozostaje warunkiem formalnej deklaracji |

## Kolejność demonstracji dla oceniających

1. Otwórz `/kampania` i pokaż hasło, logotyp, animację oraz trzy kroki dla dysponenta.
2. Otwórz `/zrodla`, aby pokazać rozproszone źródła, ich zakres referencyjny, licencję, ograniczenia oraz osobny status pobrania.
3. Otwórz `/standard`, pobierz XLSX i pokaż zakładkę `Dane_AED`.
4. Otwórz `/dodaj`, zaimportuj CSV, GeoJSON lub arkusz z zakładką `Dane_AED` wraz z zakresem źródła.
5. Otwórz `/moderacja`, pokaż bramkę licencji, kolejkę i ręczną ocenę duplikatu.
6. Wróć do katalogu i pokaż pobranie otwartych danych oraz metadanych JSON-LD.

## Kontrola przed złożeniem

- Dołączyć aktualny eksport XLSX z `artifacts/submission/` oraz źródła kodu, bez `node_modules`, `.next*`, `.data*` i sekretów.
- Uruchomić w docelowym środowisku test klawiaturą, czytnikiem ekranu i przy powiększeniu 200%; odnotować wynik audytu zamiast deklarować go z wyprzedzeniem.
- Potwierdzić u każdego dysponenta licencję, osobę publikującą, dokładny zasięg oraz częstotliwość aktualizacji przed publikacją prawdziwych rekordów.
- Uzgodnić z właścicielem dane.gov.pl sposób zgłoszenia i publikacji; prototyp przygotowuje paczkę, ale nie korzysta z niezweryfikowanego API zapisu.
