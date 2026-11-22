# Punkt Życia — dane AED na ratunek

Punkt Życia to prototyp konkursowy do importu, normalizacji, walidacji, moderacji i przygotowania otwartych danych o AED. Hasło kampanii brzmi: **„Masz dane o AED? Udostępnij je raz.”** Publiczny katalog ma równorzędną listę i mapę. Importowane rekordy nie stają się publiczne, dopóki moderator nie zatwierdzi źródła i licencji oraz samego wpisu.

> Wszystkie punkty dostarczane w demonstracji są syntetyczne. Aplikacja nie służy do nawigacji ratunkowej, nie opisuje rzeczywistej dostępności AED i nie publikuje bezpośrednio do dane.gov.pl. W nagłym przypadku dzwoń pod 112.

## Wymagania

- Node.js 26 LTS (testowane: 26.13.1); Node.js 24 LTS jest obsługiwanym minimum. Wersje utrzymywane są wskazane w [harmonogramie wydań Node.js](https://nodejs.org/en/about/previous-releases).
- npm 10 lub nowszy

## Uruchomienie lokalne

```powershell
npm ci
npm run dev
```

Otwórz `http://localhost:3000`. Lokalny panel administratora znajduje się w `/moderacja`. Klucz ustawia zmienna `AED_ADMIN_TOKEN` w pliku `.env.local`.

Pliki danych są zapisywane w `.data/aed-store.json` (katalog ignorowany przez Git). Aby wrócić do czystej demonstracji, zatrzymaj aplikację i usuń ten plik. Nie wkładaj do niego danych osobowych.

### Dostęp administratora

Na nowym stanowisku uruchom `npm run admin:setup`, aby utworzyć klucz w `.env.local`, lub ustaw w tym pliku `AED_ADMIN_TOKEN`. Po wczytaniu konfiguracji przez serwer wpisz wartość w panelu `/moderacja` i wybierz „Otwórz kolejkę”. W sekcji „Edycja wpisów AED” wyszukaj wpis i zapisz zmiany. Korekta zatwierdzonego wpisu jest widoczna po odświeżeniu katalogu.

Usuwanie jest dostępne po otwarciu wpisu. Przyciski „Usuń wpis” i „Potwierdź usunięcie” wycofują jego wersje z katalogu, eksportów i kolejki. Ponowny import lub zgłoszenie tego samego wpisu dodaje go do kolejki moderacji. Operacja dotyczy lokalnego katalogu.

Komponenty panelu znajdują się w `src/components/moderation/`, zapytanie OSM w `src/sources/osm/`, a zrzuty konkursowe w `artifacts/screenshots/`. Tymczasowe magazyny testów przeglądarkowych powstają w `.build/test-runs/`.

Panel administratora zawiera kafelki Źródła, Zatwierdzone AED, Do moderacji oraz Historia i scalenia. W „Do moderacji” najpierw wyświetlane są oczekujące wpisy, od najnowszych, z wyszukiwarką nazw, adresów, identyfikatorów i źródeł. Poniżej znajdują się źródła, których licencje administrator zatwierdza osobno. Odinstalowanie źródła wstrzymuje nowe importy i zachowuje istniejące rekordy. Ponowna instalacja przywraca pobieranie.

Odświeżanie wyszukuje zbiory w katalogu dane.gov.pl i umieszcza nowe w zakładce „Do zainstalowania”. Po instalacji przycisk „Pobierz dane” uruchamia import. Odinstalowanie przenosi źródło z powrotem do zakładki „Do zainstalowania”. Usunięcie wymaga potwierdzenia, usuwa powiązane wpisy AED i przenosi źródło do zakładki „Usunięte źródła”. Tam można usunąć je z listy. Kolejne wyszukiwanie może znaleźć je ponownie.

Automatyczny konektor nowych zbiorów dane.gov.pl obsługuje GeoJSON Point i CSV z rozpoznawalnymi nagłówkami współrzędnych. Inne zasoby wymagają ręcznego przekazania i mapowania w formularzu „Dodaj dane”. Znalezienie zbioru nie potwierdza jego zakresu ani licencji.

Na stronie `/dodaj` można przesłać plik albo wybrać „Jeden AED” i podać identyfikator, współrzędne oraz źródło na telefonie. W obu przypadkach dane trafiają do tej samej kolejki moderacji.

## Polecenia

```powershell
npm test                 # testy logiki domenowej, importu, eksportu i magazynu
npm run typecheck        # sprawdzenie typów TypeScript
npm run build            # produkcyjna kompilacja Next.js
npm run start            # uruchomienie skompilowanej aplikacji
npm run e2e -- --workers=1 # przepływy w przeglądarce (Edge)
npm run capture:screenshots -- --workers=1 # zrzuty z produkcyjnego builda
```

Zrzuty wymagają wcześniejszego `npm run build`. Testy E2E i podgląd otwierają lokalny serwer.

## Co działa

- katalog AED z wyszukiwaniem, filtrem dostępu, szczegółami pochodzenia i przełączanym widokiem mapy; po pierwszej moderowanej publikacji pokazuje rekordy rzeczywistych źródeł zamiast danych demo;
- import CSV (UTF-8/BOM, separator automatyczny i mapowanie kolumn), GeoJSON Point oraz kanonicznego XLSX z arkuszem `Dane_AED`;
- limity pliku, walidacja współrzędnych i raport odrzuceń/ostrzeżeń;
- oczekująca kolejka moderacji i rejestr źródeł;
- katalog źródeł z zakresem referencyjnym (geografia, data i częstotliwość danych, ograniczenia), wskaźnikiem świeżości pobrania i rozdzieleniem źródeł krajowych, lokalnych oraz przekazanych pod `/zrodla`;
- serwerowe konektory do eksportu Polski OpenAEDMap oraz skonfigurowanych zasobów Krosna, Marek i Przemyśla na dane.gov.pl; moderator może odświeżyć je pojedynczo albo zbiorczo, następnie zatwierdzić licencję i rekordy przed wyświetleniem;
- bezpośrednie pobieranie obiektów `emergency=defibrillator` z OpenStreetMap przez europejską replikę Overpass. W panelu wybierz „OpenStreetMap — AED w Polsce” i „Pobierz dane”. Każdy wpis zachowuje typ i ID obiektu OSM, link źródłowy oraz oznaczenie ODbL;
- konektor API Warszawy wymagający sekretu `AED_WARSAW_API_TOKEN`; dokumentacja endpointu z portalu nie jest traktowana jak rekordy AED;
- pobrania moderatora zapisywane w historii importów; każdy rekord nadal wymaga osobnej moderacji i kontroli licencji;
- oddzielne zatwierdzanie licencji i rekordu;
- sugestie bliskich punktów bez automatycznego scalania, ręczne scalenie, pełne zachowanie źródeł i cofnięcie scalenia;
- eksport licencjonowanych rekordów do CSV, JSON i GeoJSON oraz metadane publikacyjne JSON-LD (DCAT) pod `/api/metadata`;
- szablon XLSX v0.2 z instrukcją, słownikiem pól, wartościami, rejestrem źródeł i przykładami błędów; statyczna kopia konkursowa jest w `artifacts/submission/`;
- kampania „Dane AED na ratunek” z logotypem, animacją respektującą ustawienie ograniczenia ruchu, jasnym wezwaniem do działania i trzema krokami przekazania danych;
- strony objaśniające standard danych i przebieg misji, z linkiem pomijania treści, opisem alternatywnym mapy i dostępnymi regionami tabel.

## Ograniczenia prototypu

Magazyn JSON i kolejka zapisu są przeznaczone do jednego procesu demonstracyjnego. Przed wdrożeniem wieloużytkowym należy podłączyć transakcyjny magazyn, właściwe logowanie, kopie zapasowe i monitoring. Klucz administratora jest konfigurowany przez `AED_ADMIN_TOKEN`. Zbiorcze odświeżenie uruchamia administrator.

Mapa pobiera kafelki OpenStreetMap i wymaga sieci; lista, import i pozostałe widoki działają bez kafelków. Katalog obejmuje sześć skonfigurowanych profili. OpenStreetMap i OpenAEDMap mają wspólne źródło pierwotne. Pozostałe organizacje mogą przekazać CSV/GeoJSON; dodanie kolejnych konektorów wymaga jawnego profilu, potwierdzenia praw i testu adaptera. Zakres portalu nie dowodzi kompletności danych ani bieżącej sprawności AED. Eksport jest paczką do publikacji przez podmiot posiadający konto i uprawnienia w dane.gov.pl.

## Dokumentacja projektu

- [Decyzje architektoniczne](docs/architecture-decisions.md)
- [Standard danych AED](docs/data-standard.md)
- [Macierz wymagań](docs/requirements-matrix.md)
- [Bezpieczeństwo i dostępność](docs/security-accessibility.md)
- [Scenariusz demonstracji](docs/demo-script.md)
- [Rejestr źródeł i założeń](docs/source-register.md)
- [Raport weryfikacji](docs/verification.md)
- [Lista przekazania konkursowego](docs/submission-checklist.md)

