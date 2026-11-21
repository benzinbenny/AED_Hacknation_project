# Raport weryfikacji

Wyniki z 21 listopada 2026 r., Windows, Node.js 26.13.1 i Microsoft Edge.

| Polecenie | Wynik |
|---|---|
| `npm test -- --reporter=dot` | 13 plików testowych, 35 testów zaliczonych |
| `npm run typecheck` | zaliczone |
| `npm run build` | zaliczone; Next.js skompilował strony i endpointy API |
| `npm run e2e -- --workers=1` | 7 przepływów przeglądarkowych zaliczonych, w tym katalog źródeł, zakres przekazanego źródła, standard i moderacja |
| `e2e/capture-screenshots.spec.ts` | przebieg przechwytywania ujęć zawarty w pełnym E2E zakończył się powodzeniem |
| Render finalnego PPTX | 8 slajdów zaimportowano ponownie i wyrenderowano; kontrola układu oraz importu pakietu zaliczona wcześniej |

Pierwsza próba builda i E2E w sandboxie zatrzymała się na braku uprawnień do utworzenia junction w `.next/node_modules`. Po zgodzie na uruchomienie poza sandboxem kompilacja i E2E zakończyły się powodzeniem.

Testy konektorów używają kontrolowanych odpowiedzi HTTP; nie wykonują importu operacyjnego z żywych źródeł. Dane portalu i formaty zostały zbadane podczas przygotowania profili. Konektor Warszawy nie był testowany z tokenem, którego prototyp nie ma. Dane pobrane z konektorów nadal wymagają decyzji moderatora.

Edge zgłosił ostrzeżenie hydratacji dotyczące `style={{caret-color: "transparent"}}` na polu wyszukiwania. Testy mimo tego zakończyły się powodzeniem; źródło atrybutu nie zostało ustalone. W środowisku przechwytywania mogą nie załadować się kafelki OpenStreetMap; lista punktów pozostaje dostępna.

Nie wykonano manualnego audytu z czytnikiem ekranu ani nie potwierdzono zgodności WCAG. Prototyp nadal nie ma produkcyjnego logowania, wieloprocesowej bazy, pełnej ewidencji wszystkich dysponentów ani bezpośredniego zapisu do dane.gov.pl.
