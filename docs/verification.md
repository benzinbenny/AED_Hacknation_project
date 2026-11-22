# Raport weryfikacji

Wyniki z 21 listopada 2026 r., Windows, Node.js 26.13.1 i Microsoft Edge.

| Kontrola | Wynik |
|---|---|
| `npm test` | 19 plików testowych, 56 testów zaliczonych |
| `npm run typecheck` | zaliczone |
| `$env:AED_NEXT_DIST_DIR='.next-build'; npm run build` | zaliczone; Next.js skompilował strony i endpointy API w odizolowanym katalogu builda |
| `npm run e2e -- --workers=1 --reporter=dot` | 19 scenariuszy obejmuje m.in. instalację źródeł, blokadę pobierania po odinstalowaniu, porównanie z importem, edycję i usunięcie wpisu oraz wysłanie zgłoszenia w mobilnej emulacji dotyku przy szerokościach 320 i 390 px. |
| Zrzuty konkursowe | Jedenaście ujęć generowanych przez scenariusz Playwright znajduje się w `artifacts/screenshots/`, w tym nowy panel kafelkowy i formularz „Jeden AED” na telefonie. |
| Sprawdzenie pojedynczego AED w OSM | Konektor przesłał identyfikator `node/13686076701` i otrzymał jeden rzeczywisty rekord z repliki OSM. |
| Import rzeczywistych danych OSM | Indeks Polski OpenAEDMap zawierał 18 304 identyfikatory. Konektor Overpass odczytał i znormalizował w pamięci 18 293 rekordy AED z repliki datowanej na 20 listopada 2026 r. |
| Dostępność publicznych endpointów | Odczytowy test: eksport Polski OpenAEDMap zwrócił `HTTP 200` i `application/geo+json`; API dane.gov.pl dla zbioru Krosna zwróciło `HTTP 200` i `application/vnd.api+json` |
| Kontrola XLSX | `Punkt-Zycia-standard-danych-AED.xlsx` ma zakładki: `Instrukcja`, `Dane_AED`, `Slownik_pol`, `Slowniki_wartosci`, `Zrodla`, `Przyklady_bledow`; instrukcja wskazuje wersję 0.2 |
| Kontrola prezentacji | Plik PPTX zawiera 8 slajdów, czyli więcej niż wymagane 5 |

Pierwsza próba builda w sandboxie zatrzymała się na braku uprawnień Windows do utworzenia junction przez Turbopack. Produkcyjna kompilacja i testy przeglądarkowe zostały następnie wykonane poza sandboxem w lokalnych katalogach projektu. Ostatni raport Playwright ma status `passed`.

Zrzuty nie ukrywają kursora przez wstrzyknięty styl, dzięki czemu nie wywołują fałszywego ostrzeżenia hydratacji. W środowisku przechwytywania mogą nie załadować się kafelki OpenStreetMap; lista punktów i opis mapy pozostają dostępne.

Testy konektorów używają kontrolowanych odpowiedzi HTTP; nie wykonują importu operacyjnego z żywych źródeł. Odczytowy test potwierdził dostępność dwóch publicznych endpointów, ale nie zapisywał ani nie publikował ich rekordów. Testy sprawdzają jednak przekazanie bieżącej licencji i daty metadanych do referencji rekordów. Konektor Warszawy nie był testowany z rzeczywistym tokenem. Dane pobrane z konektorów nadal wymagają decyzji moderatora i kontroli licencji.

Nie wykonano manualnego audytu z czytnikiem ekranu, klawiaturą ani przy powiększeniu. Nie deklarujemy zgodności WCAG 2.2 AA. Prototyp nadal nie ma produkcyjnego logowania, wieloprocesowej bazy, pełnej ewidencji wszystkich dysponentów ani bezpośredniego zapisu do dane.gov.pl.
