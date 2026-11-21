# Punkt Życia — dane AED na ratunek

Punkt Życia to prototyp konkursowy do importu, normalizacji, walidacji, moderacji i przygotowania otwartych danych o AED. Publiczny katalog ma równorzędną listę i mapę. Importowane rekordy nie stają się publiczne, dopóki moderator nie zatwierdzi źródła i licencji oraz samego wpisu.

> Wszystkie punkty dostarczane w demonstracji są syntetyczne. Aplikacja nie służy do nawigacji ratunkowej, nie opisuje rzeczywistej dostępności AED i nie publikuje bezpośrednio do dane.gov.pl. W nagłym przypadku dzwoń pod 112.

## Wymagania

- Node.js 26 LTS (testowane: 26.13.1); Node.js 24 LTS jest obsługiwanym minimum. Wersje utrzymywane są wskazane w [harmonogramie wydań Node.js](https://nodejs.org/en/about/previous-releases).
- npm 10 lub nowszy

## Uruchomienie lokalne

```powershell
npm ci
npm run dev
```

Otwórz `http://localhost:3000`. Lokalny panel demonstracyjny znajduje się w `/moderacja`; w trybie deweloperskim token jest wstępnie wpisany. Domyślny token `PUNKT-ZYCIA-DEMO` jest wyłącznie do lokalnej demonstracji.

Pliki danych są zapisywane w `.data/aed-store.json` (katalog ignorowany przez Git). Aby wrócić do czystej demonstracji, zatrzymaj aplikację i usuń ten plik. Nie wkładaj do niego danych osobowych.

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

- katalog AED z wyszukiwaniem, filtrem dostępu, szczegółami pochodzenia i przełączanym widokiem mapy;
- import CSV (UTF-8/BOM, separator automatyczny, mapowanie kolumn) oraz GeoJSON Point;
- limity pliku, walidacja współrzędnych i raport odrzuceń/ostrzeżeń;
- oczekująca kolejka moderacji i rejestr źródeł;
- katalog źródeł z zakresem referencyjnym (geografia, data i częstotliwość danych, ograniczenia) pod `/zrodla`;
- serwerowe konektory do eksportu Polski OpenAEDMap oraz skonfigurowanych zasobów Krosna, Marek i Przemyśla na dane.gov.pl;
- konektor API Warszawy wymagający sekretu `AED_WARSAW_API_TOKEN`; dokumentacja endpointu z portalu nie jest traktowana jak rekordy AED;
- pobrania moderatora zapisywane w historii importów; każdy rekord nadal wymaga osobnej moderacji i kontroli licencji;
- oddzielne zatwierdzanie licencji i rekordu;
- sugestie bliskich punktów bez automatycznego scalania, ręczne scalenie, pełne zachowanie źródeł i cofnięcie scalenia;
- eksport licencjonowanych rekordów do CSV, JSON i GeoJSON;
- szablon XLSX z instrukcją, słownikiem pól, wartościami, rejestrem źródeł i przykładami błędów;
- strony objaśniające standard danych i przebieg misji.

## Ograniczenia prototypu

Magazyn JSON i kolejka zapisu są przeznaczone do jednego procesu demonstracyjnego. Przed wdrożeniem wieloużytkownikowym należy podłączyć transakcyjny magazyn (np. PostgreSQL), migracje schematu, właściwe role i logowanie przez zatwierdzony system tożsamości, retencję kopii zapasowych, monitoring i testy obciążeniowe. Token moderatora zabezpiecza przykładowe endpointy, ale nie zastępuje produkcyjnego uwierzytelniania. W produkcji brak skonfigurowanego `AED_MODERATOR_TOKEN` zamyka panel.

Mapa pobiera kafelki OpenStreetMap i wymaga sieci; lista, import i pozostałe widoki działają bez kafelków. Katalog konektorów obejmuje pięć znanych profili i nie jest pełnym rejestrem wszystkich polskich dysponentów. Pozostałe organizacje mogą przekazać CSV/GeoJSON; dodanie kolejnych konektorów wymaga jawnego profilu, potwierdzenia praw i testu adaptera. Zakres portalu nie dowodzi kompletności danych ani bieżącej sprawności AED. Aplikacja nie zapisuje bezpośrednio do dane.gov.pl: eksport jest paczką do publikacji przez podmiot posiadający konto i uprawnienia.

## Dokumentacja projektu

- [Decyzje architektoniczne](docs/architecture-decisions.md)
- [Standard danych AED](docs/data-standard.md)
- [Macierz wymagań](docs/requirements-matrix.md)
- [Bezpieczeństwo i dostępność](docs/security-accessibility.md)
- [Scenariusz demonstracji](docs/demo-script.md)
- [Rejestr źródeł i założeń](docs/source-register.md)
- [Raport weryfikacji](docs/verification.md)
