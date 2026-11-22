# Punkt Życia — opis techniczny aplikacji

Stan dokumentu: 22 listopada 2026 r. Opis odnosi się do kodu znajdującego się w tym projekcie. Punkt Życia jest prototypem zbierania i przygotowania danych o automatycznych defibrylatorach zewnętrznych, czyli AED.

## 1. Cel i zakres

Aplikacja umożliwia zebranie danych o AED z kilku skonfigurowanych źródeł oraz z plików przekazanych przez dysponentów. Sprowadza otrzymane dane do wspólnego modelu, zachowuje pochodzenie i przekazuje rekordy administratorowi do oceny. Zatwierdzone informacje można przeglądać w katalogu i przygotować do dalszej publikacji w otwartych formatach.

Zakres prototypu obejmuje również ręczne zgłoszenie jednego urządzenia, wyszukiwanie kandydatów na duplikaty, ręczne scalanie rekordów, edycję i usuwanie wpisów oraz wzorcowy arkusz danych. Źródła mają opis zakresu geograficznego i czasowego, licencji oraz ograniczeń.

Zestaw nie stanowi pełnej ewidencji wszystkich AED w Polsce. Dane ze źródeł nie potwierdzają automatycznie aktualnej dostępności ani sprawności urządzenia. Aplikacja przygotowuje pliki do przekazania uprawnionemu wydawcy, a proces publikacji do dane.gov.pl odbywa się poza aplikacją.

## 2. Technologia i architektura

| Warstwa | Zastosowana technologia i zadanie |
| --- | --- |
| Język | TypeScript w interfejsie, logice domenowej i serwerowych endpointach |
| Aplikacja webowa | Next.js 16.4.6 z App Router oraz React i React DOM 19.3.1 |
| Język i środowisko narzędziowe | TypeScript 7.0.2, Node.js `>=24 <27`; zależności są zadeklarowane w `package.json` i utrwalone w `package-lock.json` |
| Walidacja | Zod 4.6.7 sprawdza m.in. strukturę rekordów i żądań |
| CSV i XLSX | Papa Parse 5.7.1 odczytuje CSV, ExcelJS 4.4.0 obsługuje arkusze XLSX |
| Mapa | Leaflet 1.9.4 i React Leaflet 5.0.0 |
| Magazyn | Lokalny plik JSON obsługiwany przez repozytorium Node.js |
| Testy | Vitest dla testów jednostkowych, Playwright i Microsoft Edge dla scenariuszy przeglądarkowych, axe-core dla części automatycznych kontroli dostępności |

Projekt wymaga Node.js w zakresie zadeklarowanym w `package.json`, tj. `>=24 <27`. Strony znajdują się w katalogu `app/`, a obsługujące je komponenty, model i logika w `src/`. Backend udostępniono jako Route Handlers Next.js pod `/api/`. Wiele stron i formularzy wykorzystuje komponenty React uruchamiane w przeglądarce.

```text
OSM / OpenAEDMap / dane.gov.pl / API Warszawy / plik / formularz
                              │
                pobranie lub przesłanie
                              │
             walidacja i normalizacja do AedRecord
                              │
              źródła + kolejka oczekujących AED
                              │
          administrator sprawdza licencję i rekord
                              │
               zatwierdzone rekordy w magazynie
                     │                    │
                katalog i mapa       eksport plików
                                          │
                             dalsza publikacja przez wydawcę
```

## 3. Widoki aplikacji

| Adres | Funkcja |
| --- | --- |
| `/` | Katalog z listą, wyszukiwaniem, filtrem dostępu, szczegółami wpisów oraz mapą |
| `/dodaj` | Formularz pojedynczego AED i przesyłanie plików |
| `/zrodla` | Rejestr źródeł, zakres, licencja, świeżość pobrania, wyszukiwanie i wybór zasięgu |
| `/standard` | Objaśnienie modelu i odnośniki do wzorca XLSX, eksportów oraz metadanych |
| `/kampania` | Hasło akcji, logo i opis przekazywania danych |
| `/moderacja` | Panel administratora do importowania, oceny, edycji i usuwania rekordów oraz obsługi źródeł i scaleń |

Mapa jest prezentowana razem z alternatywnym widokiem listy. Kafelki mapowe wymagają połączenia z usługą zewnętrzną. Interfejs zawiera m.in. etykiety formularzy, widoczny fokus, odnośnik do treści i obsługę preferencji ograniczenia ruchu. Automatyczne testy dostępności obejmują wybrane strony i wykrywają część problemów, lecz nie stanowią pełnego audytu WCAG.

## 4. Model rekordu AED

Podstawowym modelem jest `AedRecordSchema` w `src/domain/types.ts`. Rekord zawiera wewnętrzny identyfikator UUID, współrzędne i co najmniej jedną referencję źródłową. Inne dane mogą być nieznane lub pominięte, zależnie od pola.

| Grupa danych | Przykładowa zawartość |
| --- | --- |
| Urządzenie i podmiot | Nazwa, operator, identyfikator lub odnośnik zewnętrzny |
| Lokalizacja | Szerokość i długość geograficzna, adres, opis miejsca, dokładność, piętro, wejście, dane administracyjne i kody TERYT |
| Dostęp | Typ dostępu, dodatkowe warunki, opis godzin, ocena dostępności według harmonogramu |
| Stan i weryfikacja | Zgłoszony stan urządzenia, data i metoda weryfikacji, jej zakres oraz planowany termin kolejnej weryfikacji |
| Status wpisu | `active`, `temporarily_removed`, `removed` lub `unknown` |
| Pochodzenie | Identyfikator źródła i rekordu, URL, data pobrania, data danych, licencja, atrybucja i skrót rekordu źródłowego, gdy są dostępne |
| Korekta i zgłoszenie | Lokalna korekta administratora z datą oraz opcjonalny sposób przekazania `manual` albo `file` |

Typ dostępu może przyjąć wartości `public`, `customers`, `restricted`, `private` i `unknown`. Stan urządzenia jest oznaczany jako `reported_operational`, `reported_out_of_service` albo `unknown`. Aplikacja oddziela opis godzin dostępu od informacji o stanie technicznym.

Współrzędne są przechowywane jako `latitude` i `longitude`. GeoJSON używa kolejności `[longitude, latitude]`. Dane geograficzne i kody TERYT mogą być zapisane w modelu, ale aplikacja nie porównuje ich automatycznie z urzędowym rejestrem TERYT.

Identyfikator AED jest wyznaczany deterministycznie z identyfikatora źródła i identyfikatora rekordu źródłowego w `src/import/geojson.ts`. Dla źródeł przekazanych przez formularz wewnętrzny identyfikator źródła powstaje ze skrótu URL. Ten sam identyfikator źródłowy w tym samym źródle służy więc do powiązania kolejnego importu z wcześniejszą wersją. Zmiana URL źródła może spowodować powstanie innego identyfikatora.

## 5. Skonfigurowane źródła

Definicje źródeł znajdują się w `src/sources/catalog.ts`, a pobieranie i adaptery w `src/sources/collect.ts` i `src/sources/adapters.ts`.

| Profil | Sposób pozyskania | Zakres i istotne ograniczenie |
| --- | --- | --- |
| OpenStreetMap | Zapytania do repliki Overpass dla obiektów `emergency=defibrillator` | Identyfikatory krajowego pobrania pochodzą z indeksu OpenAEDMap. Położenie obiektów typu way i relation jest przybliżane na podstawie środka obiektu. |
| OpenAEDMap | Eksport GeoJSON dla Polski | Zasięg krajowego eksportu nie oznacza kompletnego rejestru. Dane mają wspólne pochodzenie z OSM. |
| Krosno | Zasób CSV wyszukany przez API dane.gov.pl | Zakres lokalny, mapowanie kolumn zgodnie z konfiguracją profilu. |
| Marki | Zasób CSV wyszukany przez API dane.gov.pl | Adapter obsługuje również opublikowany wariant jednokolumnowy. Profil dokumentuje niezgodność nagłówków współrzędnych z większością wartości. |
| Przemyśl | Zasób GeoJSON wyszukany przez API dane.gov.pl | Zakres lokalny. Data pobranego zasobu i deklarowana częstotliwość powinny być oceniane osobno. |
| Warszawa | Zapytanie do API miejskiego | Dostęp wymaga tokenu `AED_WARSAW_API_TOKEN` po stronie serwera. |

Administrator może uruchomić pobranie pojedynczego zainstalowanego konektora. Przycisk „Odśwież publiczne źródła” wyszukuje zbiory w katalogu dane.gov.pl; nie pobiera zbiorczo rekordów AED. Nie ma wbudowanego harmonogramu okresowych pobrań.

Odświeżanie wyszukuje kandydatów wyłącznie przez API katalogu dane.gov.pl i zapisuje nowe zbiory jako dostępne do instalacji. Nie jest wyszukiwarką całego internetu. Instalacja zmienia stan w lokalnym rejestrze, a pobieranie danych jest osobną operacją. Konektor nowo znalezionego zbioru wybiera pierwszy zasób CSV lub GeoJSON wśród maksymalnie 100 zwróconych zasobów; obsługuje GeoJSON Point oraz CSV z rozpoznawalnymi nagłówkami współrzędnych. Nie wszystkie zbiory zawierają obsługiwany zasób lub pola; pozostałe formaty i niestandardowe kolumny wymagają ręcznego importu, jeśli aplikacja obsługuje dany format. Źródło dodane przez przesłanie pliku nie staje się automatycznie konektorem pobierającym jego URL.

Administrator może usunąć źródło wraz z powiązanymi zatwierdzonymi i oczekującymi rekordami, również objętymi aktywnym scaleniem. Źródło trafia do listy usuniętych, z której można je trwale usunąć po potwierdzeniu. Historia importów i decyzji pozostaje. Zbiór nadal znajdujący się na liście usuniętych nie zostanie automatycznie przywrócony przez wyszukiwanie. Po trwałym usunięciu kolejne wyszukiwanie może znaleźć zbiór ponownie, o ile zwraca go API dane.gov.pl. Dane demonstracyjne ani dowolne ręcznie przesłane pliki nie są przez ten mechanizm wyszukiwane w internecie.

Konektory ograniczają dozwolone hosty i przekierowania, sprawdzają format odpowiedzi oraz stosują limity rozmiaru i czasu. W konfiguracji są m.in. limity 8 MiB dla zasobów publicznych i 20 MiB dla krajowego GeoJSON. Błąd pobrania jest zgłaszany zamiast zapisywania częściowego wyniku jako udanego importu.

## 6. Dodawanie danych

### 6.1. Pojedynczy AED

Użytkownik wybiera `Jeden AED`, podaje identyfikator źródłowy, współrzędne i wymagane dane źródła. Nazwa i adres urządzenia są opcjonalne. Formularz przyjmuje przecinek lub kropkę w zapisie współrzędnych, sprawdza ich zakres i tworzy w przeglądarce dokument GeoJSON `FeatureCollection` z jednym punktem. Następnie wysyła go jako plik w żądaniu `POST /api/import` z oznaczeniem `submissionMethod=manual`.

### 6.2. Import plików

Formularz obsługuje CSV, GeoJSON/JSON oraz wzorcowy XLSX. Limit pojedynczego przesyłanego pliku wynosi 5 MiB. Użytkownik podaje nazwę źródła, URL, opcjonalną licencję i atrybucję oraz może opisać zakres referencyjny.

W CSV aplikacja pokazuje podgląd i pozwala przypisać kolumny modelu do nagłówków pliku. Dla GeoJSON obsługiwane są punkty `Point` z identyfikatorem źródłowym. XLSX wymaga arkusza `Dane_AED` i nagłówków opisanych we wzorcu. Importer sprawdza również strukturę ZIP arkusza, a formuły nie są wykonywane jako dane wejściowe.

Serwer odrzuca m.in. brak identyfikatora i niepoprawną geometrię lub współrzędne. Punkt poza przybliżonym zakresem Polski wywołuje ostrzeżenie. Raport zawiera liczbę przyjętych i odrzuconych rekordów oraz ostrzeżenia. Gdy żaden rekord nie przejdzie walidacji, formularz nie tworzy pustego źródła.

Zatwierdzenie licencji i zatwierdzenie samego AED są odrębnymi decyzjami. Przesłanie poprawnych danych nie powoduje ich natychmiastowej publikacji w katalogu.

## 7. Przetwarzanie, kolejka i decyzje

Funkcja `stageImport` rejestruje źródło i przebieg importu oraz zapisuje poprawne rekordy w `pendingRecords`. Gdy rekord o tym samym identyfikatorze już istnieje, kolejna wersja trafia do kolejki, a istniejące lokalne korekty są stosowane do wersji oczekującej. Zatwierdzony wpis pozostaje widoczny do czasu podjęcia nowej decyzji.

Jeżeli zmienią się istotne metadane źródła, np. URL, pochodzenie, licencja, atrybucja lub zakres, aplikacja wymaga ponownej kontroli licencji. Źródło wcześniej zablokowane pozostaje zablokowane. Administrator może zatwierdzić lub zablokować źródło oraz zatwierdzić albo odrzucić pojedynczy rekord.

W widoku `Do moderacji` znajdują się najpierw oczekujące AED, a poniżej źródła i ich statusy. Kolejkę można przeszukać po nazwie, adresie, identyfikatorze lub źródle, a także filtrować po sposobie dodania i źródle. Widok sortuje rekordy według najnowszej daty pobrania przypisanej do referencji źródłowej i pokazuje 30 wpisów na stronę. Starsze zgłoszenia, które nie mają zapisanego sposobu dodania, są rozpoznawane jako starsze bez oznaczenia, chyba że należą do skonfigurowanego konektora.

Każda decyzja o rekordzie jest zapisywana z datą i opcjonalnym uzasadnieniem. Automatyczne zatwierdzanie rekordów nie jest zaimplementowane.

## 8. Edycja, usuwanie i kontrola źródła

Administrator może poprawić m.in. nazwę, operatora, adres, opis lokalizacji, współrzędne, rodzaj i warunki dostępu oraz zgłoszony stan. Edycja korzysta ze skrótu wersji rekordu. Gdy dane zmienią się od chwili otwarcia formularza, serwer zwraca konflikt i wymaga ponownego otwarcia aktualnej wersji.

Korekta jest zachowywana jako `localCorrection` i stosowana przy następnym imporcie. Zmiany istotnych danych mogą wyczyścić poprzednie informacje o weryfikacji, gdyż wcześniejsze potwierdzenie nie musi odnosić się do poprawionych wartości.

Usunięcie wycofuje wpis z katalogu i kolejki oraz obejmuje powiązane wersje aktywnie scalone. Identyfikatory nie są blokowane przed ponownym importem. Ponownie przesłany rekord wraca do kolejki. Wcześniejsze wpisy blokujące import są obsługiwane podczas wczytywania starszej wersji magazynu.

Przycisk sprawdzania zatwierdzonego AED porównuje wybrane pola katalogu z aktualnie pobranym źródłem. Dla OSM możliwe jest sprawdzenie wskazanych identyfikatorów obiektów. Dla źródła plikowego porównanie wykorzystuje nowszą wersję w kolejce, jeśli została dostarczona. Wynik porównania sam nie nadpisuje zatwierdzonego wpisu.

## 9. Duplikaty i historia

`findDuplicateCandidates` wyszukuje pary punktów w zadanym promieniu. Panel używa progu 30 m, oblicza odległość geograficzną i ogranicza widoczny podgląd do 40 par. Bliskość jest sygnałem do sprawdzenia, a nie automatycznym potwierdzeniem duplikatu. Liczba niezależnych źródeł jest szacowana na podstawie pochodzenia wskazanego w referencjach.

Administrator może ręcznie scalić dwa zatwierdzone rekordy, wskazując rekord pozostający i uzasadnienie. Referencje źródłowe są łączone, a wybrane brakujące wartości mogą zostać uzupełnione z drugiego rekordu. Historia przechowuje stan sprzed scalenia. Aktywne scalenie można cofnąć, z uwzględnieniem późniejszych zależnych scaleń. Usunięcie wpisu unieważnia możliwość cofnięcia dotyczącego go aktywnego scalenia.

Historia obejmuje również przebiegi importów i decyzje administracyjne. Jest przechowywana w tym samym lokalnym pliku JSON co rekordy.

## 10. Eksport i metadane

| Endpoint | Wynik |
| --- | --- |
| `GET /api/aed` | Dane wyświetlane publicznie wraz z informacją o źródłach i obecności danych demonstracyjnych |
| `GET /api/aed/{id}` | Szczegóły publicznego rekordu |
| `GET /api/export/csv` | Plik CSV z rekordami dopuszczonymi do eksportu |
| `GET /api/export/json` | JSON z metadanymi generowania i rekordami |
| `GET /api/export/geojson` | GeoJSON `FeatureCollection` z punktami i właściwościami |
| `GET /api/metadata` | Metadane publikacyjne JSON-LD oparte na DCAT |
| `GET /api/standard` | Wzorcowy arkusz XLSX |

Eksport obejmuje rekordy zatwierdzone, których źródła mają zatwierdzony status oraz określoną licencję. Dane syntetyczne są wyłączane z eksportu. Eksport CSV zabezpiecza pola tekstowe przed interpretacją jako formuły arkusza.

Publiczny katalog może wyświetlać dane demonstracyjne, gdy nie ma dostępnych rekordów rzeczywistych. Po pojawieniu się rekordów rzeczywistych widok publiczny wybiera je zamiast zestawu demonstracyjnego. Wygenerowany plik jest przygotowaniem do publikacji, a nie potwierdzeniem, że został umieszczony w dane.gov.pl.

## 11. API administracyjne

Żądania administracyjne przekazują klucz w nagłówku `x-moderator-token`. Pomimo historycznej nazwy nagłówka obecna implementacja sprawdza jedną wartość `AED_ADMIN_TOKEN` i nadaje dostęp administratora.

| Endpoint | Operacja |
| --- | --- |
| `GET /api/moderation` | Pobranie stanu źródeł, rekordów, kolejki i historii |
| `POST /api/moderation/discover` | Wyszukanie zbiorów AED w dane.gov.pl i zapisanie nowych źródeł do instalacji |
| `POST /api/collect/{sourceId}` | Pobranie danych zainstalowanego źródła obsługiwanego konektorem do kolejki |
| `PUT /api/moderation/sources/{sourceId}/installation` | Odinstalowanie lub ponowne zainstalowanie źródła |
| `DELETE /api/moderation/sources/{sourceId}` | Usunięcie źródła z aktywnego katalogu i powiązanych rekordów AED |
| `DELETE /api/moderation/sources/{sourceId}?permanent=true` | Usunięcie źródła z listy usuniętych; zachowanie znacznika zapobiegającego jego samoczynnemu pojawieniu się przed ponownym odkryciem |
| `POST /api/moderation/source/{id}` | Zatwierdzenie lub zablokowanie źródła |
| `GET /api/moderation/{id}?stage=published\|pending` | Pobranie rekordu i wersji do edycji lub usunięcia |
| `PATCH /api/moderation/{id}` | Zapis korekty rekordu z kontrolą wersji |
| `DELETE /api/moderation/{id}` | Usunięcie rekordu z kontrolą wersji |
| `POST /api/moderation/{id}` | Zatwierdzenie lub odrzucenie oczekującego AED |
| `POST /api/moderation/{id}/check?source=…` | Porównanie zatwierdzonego wpisu ze źródłem lub nowszym importem |
| `POST /api/moderation/merge` | Ręczne scalenie dwóch wpisów |
| `POST /api/moderation/merge/{id}/undo` | Cofnięcie dopuszczalnego scalenia |

`POST /api/import` jest dostępny dla formularza przekazania danych i zapisuje poprawne wpisy do kolejki. Panel administratora i operacje administracyjne wymagają poprawnego klucza.

## 12. Magazyn i spójność

Domyślna ścieżka magazynu to `.data/aed-store.json`. Zmienna `AED_STORE_PATH` może wskazać inną lokalizację. Magazyn ma wersję schematu 1 i zawiera źródła, rekordy zatwierdzone, rekordy oczekujące, importy, decyzje, historię scaleń oraz listy identyfikatorów źródeł odinstalowanych, usuniętych i trwale usuniętych.

`JsonFileRepository` waliduje dokument przez Zod. Aktualizacje w ramach jednej instancji są szeregowane kolejką Promise, a zapis wykonywany jest przez plik tymczasowy i zmianę nazwy. Przy braku pliku aplikacja korzysta z danych demonstracyjnych.

To rozwiązanie jest przeznaczone do pojedynczego procesu demonstracyjnego. Kolejka nie jest rozproszoną blokadą między procesami ani transakcyjną bazą danych. Cały plik i kolejka są wczytywane do pamięci, co ogranicza skalowanie przy dużej liczbie wpisów i wielu użytkownikach.

## 13. Uruchomienie i konfiguracja

```powershell
npm ci
npm run dev
```

Domyślny adres lokalny to `http://localhost:3000`. Przed użyciem panelu należy ustawić `AED_ADMIN_TOKEN` w lokalnej konfiguracji i uruchomić serwer z tą konfiguracją. Opcjonalny `AED_WARSAW_API_TOKEN` służy do połączenia z API Warszawy. `AED_NEXT_DIST_DIR` zmienia katalog wynikowy Next.js. `AED_STORE_PATH` zmienia ścieżkę danych.

Plik `.env.local` zawiera konfigurację lokalną i jest wykluczony z repozytorium. Bieżąca implementacja korzysta z `AED_ADMIN_TOKEN`; historyczne nazwy zmiennych moderatora mogą nadal występować w starszych materiałach projektu i pliku przykładowym. Sekretów nie należy umieszczać w przekazywanej paczce.

```powershell
npm test
npm run typecheck
npm run build
npm run e2e -- --workers=1
```

Testy przeglądarkowe używają oddzielnego serwera i magazynu testowego. Testy jednostkowe sprawdzają m.in. import, walidację, licencje, korekty, scalanie oraz eksport. Uruchomienie konkretnego zestawu i jego wynik należy potwierdzić w danym środowisku.

## 14. Granice prototypu

- Klucz administratora jest pojedynczym sekretem demonstracyjnym przesyłanym w nagłówku. Prototyp nie ma kont użytkowników, indywidualnych ról ani produkcyjnego systemu logowania.
- Importy źródeł są uruchamiane ręcznie. Aplikacja nie ma niezależnej kolejki zadań, harmonogramu ani monitoringu dostępności źródeł.
- Krajowe źródła OSM i OpenAEDMap nie są niezależnymi potwierdzeniami tego samego AED. Integracja wszystkich dysponentów wymaga przekazania danych i ustalenia warunków współpracy.
- Walidacja współrzędnych i ostrzeżenie zakresu Polski nie dowodzą poprawności miejsca. Sprawność i dostępność fizyczna urządzenia wymagają potwierdzenia u dysponenta.
- Dane łączone z różnych źródeł wymagają kontroli warunków ponownego wykorzystania i atrybucji. Zapisanie licencji w aplikacji nie zastępuje oceny prawnej.
- Przy przesyłaniu plików aplikacja nie stanowi osobnego repozytorium oryginalnych załączników. Zachowuje znormalizowane rekordy, metadane, wyniki importu i skróty źródłowe tam, gdzie są dostępne.
- Aplikacja nie publikuje bezpośrednio w dane.gov.pl. Dokumentuje i eksportuje dane do przekazania podmiotowi uprawnionemu.
- Responsywność i wybrane kryteria dostępności mają testy automatyczne. Pełna zgodność WCAG wymaga osobnego audytu manualnego i usunięcia wykrytych problemów.
- Przed wdrożeniem publicznym potrzebne są m.in. transakcyjny magazyn danych, uwierzytelnianie użytkowników, kopie zapasowe, monitoring, ograniczanie nadużyć, przegląd bezpieczeństwa oraz procedury utrzymania i aktualizacji.

## 15. Mapa kodu

| Katalog lub plik | Odpowiedzialność |
| --- | --- |
| `app/` | Strony oraz endpointy HTTP |
| `src/components/` | Formularze, katalog, mapa, rejestr źródeł i panel administratora |
| `src/domain/` | Schematy danych i wyszukiwanie kandydatów na duplikaty |
| `src/import/` | Import CSV, GeoJSON i XLSX |
| `src/sources/` | Katalog źródeł, pobieranie, adaptery, świeżość i zapytania OSM |
| `src/services/` | Moderacja, licencje, korekty, scalanie i porównanie ze źródłem |
| `src/storage/` | Interfejs repozytorium i implementacja plikowa |
| `src/export/` | Serializacja danych i metadane publikacyjne |
| `src/data/` | Dane demonstracyjne |
| `e2e/` | Scenariusze przeglądarkowe i przykładowe pliki testowe |
| `artifacts/submission/` | Kopia wzorcowego arkusza danych |
| `artifacts/brand/`, `artifacts/presentation/`, `artifacts/screenshots/` | Materiały identyfikacji i prezentacji |

Szczegółowy słownik pól znajduje się w [opisie standardu danych](data-standard.md), a decyzje architektoniczne i wcześniejsze wyniki kontroli w pozostałych plikach katalogu `docs/`.

## 16. Szczegółowy kontrakt danych

Źródłem prawdy dla poniższych nazw i walidacji jest `src/domain/types.ts`; opis arkusza wymiany danych znajduje się osobno w `docs/data-standard.md`. Pola opcjonalne mogą być nieobecne, a pola oznaczone jako `null` mogą występować bez znanej wartości.

| Pole modelu | Typ i znaczenie |
| --- | --- |
| `id` | UUID rekordu; importer tworzy deterministyczny UUID w wersji 5 ze stałej przestrzeni nazw i tekstu `aed:{sourceId}:{sourceRecordId}`. |
| `submissionMethod` | Opcjonalnie `manual` lub `file`; konektory nie muszą go ustawiać. |
| `name`, `operatorName`, `address`, `locationDescription`, `accessNotes` | Tekst lub `null`; nazwa, podmiot, adres, opis umiejscowienia i warunki dostępu. |
| `externalReference` | Opcjonalny tekst lub `null`, zewnętrzne oznaczenie urządzenia. |
| `location.latitude`, `location.longitude` | Liczby odpowiednio w zakresach −90…90 i −180…180. GeoJSON zapisuje odwrotną kolejność: długość, szerokość. |
| `coordinateAccuracyMeters` | Opcjonalna nieujemna liczba lub `null`; dokładność zadeklarowana dla lokalizacji. |
| `geography` | Opcjonalny obiekt: `countryCode`, `voivodeship`, `county`, `municipality`, `locality`, `postalCode`, `terytTerc`, `terytSimc`; wartości tekstowe mogą być `null`. |
| `placement` | Opcjonalny obiekt: `indoor` (`yes`, `no`, `unknown`), `floor`, `entranceDescription`. |
| `timezone` | Opcjonalna nazwa strefy lub `null`. |
| `accessType` | `public`, `customers`, `restricted`, `private` lub `unknown`. |
| `availability` | Obiekt `rawHours` (tekst lub `null`), `state` (`open_by_schedule`, `closed_by_schedule`, `unknown`), `evaluatedAt` (data i czas lub `null`). Import nie dowodzi bieżącej dostępności. |
| `operationalStatus`, `operationalStatusObservedAt` | Zgłoszony stan: `reported_operational`, `reported_out_of_service` lub `unknown`, oraz opcjonalna data obserwacji. |
| `lastVerifiedAt`, `verificationMethod` | Data i metoda weryfikacji lub `null`. |
| `verificationActorType`, `verificationScope`, `nextVerificationDueAt` | Opcjonalne: rodzaj weryfikującego, zakres i termin następnej kontroli. Dopuszczalne wartości określa `AedRecordSchema`. |
| `recordStatus` | `active`, `temporarily_removed`, `removed` lub `unknown`. |
| `localCorrection` | Opcjonalny obiekt z `updatedAt` i `changes`; obejmuje tylko pola dopuszczone przez `RecordChangesSchema`. |
| `sources` | Co najmniej jedna referencja `SourceReferenceSchema`, opisująca pochodzenie rekordu. |

Referencja zawiera wymagane `sourceId`, `sourceRecordId`, `fetchedAt` oraz opcjonalne `upstreamSourceId`, `sourceDataDate`, `sourceUpdatedAt`, `sourceUrl`, `upstreamOrigin`, `licenseId`, `attribution` i `rawRecordHash`. Daty i czasy walidowane przez Zod muszą mieć poprawny format ISO z przesunięciem strefy, a daty bez czasu mają format `YYYY-MM-DD`. Skrót `rawRecordHash`, gdy zapisany przez importer, jest SHA-256 reprezentacji źródłowego obiektu JSON.

`StoredSource` rozszerza metadane źródła o `licenseReviewStatus`, `synthetic` oraz opcjonalny numeryczny identyfikator zbioru `datasetId`. Opis zakresu referencyjnego obejmuje nazwę i poziom geografii, opis czasu, datę danych, częstotliwość, podstawę ustalenia i ograniczenia. Dane źródłowe przekazane przez formularz mają identyfikator `upload-` i pierwsze 16 znaków szesnastkowych SHA-256 adresu URL; taka sama wartość URL tworzy ten sam identyfikator źródła.

## 17. Stany źródeł i odkrywanie

| Stan i działanie | Zapis i skutek |
| --- | --- |
| Zainstalowane | Identyfikator nie znajduje się na listach odinstalowanych, usuniętych ani trwale usuniętych. Pobieranie jest dostępne, jeśli źródło ma obsługiwany konektor. |
| Do zainstalowania | Identyfikator znajduje się w `uninstalledSourceIds`; import dla źródła jest blokowany. Instalacja usuwa identyfikator z tej listy. |
| Usunięte | Identyfikator znajduje się w `deletedSourceIds`; operacja usuwa także powiązane rekordy zatwierdzone i oczekujące, z uwzględnieniem aktywnych scaleń. Wyszukiwanie nie przywraca takiego źródła. |
| Trwale usunięte | Po `?permanent=true` metadane źródła są usunięte, a identyfikator trafia do `forgottenSourceIds`. Historia importów, decyzji i scaleń nie jest kasowana. |

Odinstalowanie zachowuje już pobrane rekordy i historię; nie należy go mylić z usunięciem. Po odkryciu nowego zbioru źródło otrzymuje identyfikator `dane-gov-dataset-{id}`, status licencji `needs_review` i stan do instalacji. Jeśli istnieje skonfigurowany profil tego samego zbioru, używany jest identyfikator profilu. Ponowne wyszukiwanie nie zmienia stanu już zainstalowanego źródła. Trwale usunięty zbiór może ponownie trafić do instalacji, jeśli zostanie znaleziony; nie oznacza to ponownego pobrania ani zatwierdzenia jego AED.

Wyszukiwanie odpytuje `https://api.dane.gov.pl/1.4/datasets` dla fraz `defibrylator` i `AED`, po maksymalnie pięć stron po 50 wyników na frazę. Tytuł lub opis musi zawierać odpowiedni termin. Wyniki są łączone według identyfikatora zbioru; niepełne wyszukiwanie zwraca także listę błędów. Limit czasu pojedynczego zapytania wynosi 20 sekund. Wynik zależy od indeksu i dostępności portalu w chwili zapytania.

## 18. Kontrakty żądań i odpowiedzi

Poniższe przykłady opisują kształt żądań; adres bazowy lokalnego serwera to domyślnie `http://localhost:3000`. Wszystkie operacje administracyjne wymagają nagłówka `x-moderator-token` z wartością skonfigurowaną na serwerze. Przykłady pomijają rzeczywisty sekret.

| Operacja | Treść i istotny wynik |
| --- | --- |
| `POST /api/moderation/discover` | Bez treści. Odpowiedź zawiera `datasets` i `errors`; zapis rejestru następuje po wyszukiwaniu. |
| `PUT /api/moderation/sources/{sourceId}/installation` | JSON `{"installed":true}` lub `{"installed":false}`; poprawna odpowiedź zwraca wybrany stan. |
| `DELETE /api/moderation/sources/{sourceId}` | Bez treści; zwraca `found` i `removedCount`. Opcja `?permanent=true` działa dla źródła znajdującego się już w usuniętych. |
| `POST /api/collect/{sourceId}` | Bez treści; wynik m.in. `runId`, `accepted`, `rejected`, `warningCount`, `issues`, `sourceDataDate`, `fetchedAt`, `moderationRequired`, `licenseReviewStatus`. |
| `POST /api/import` | `multipart/form-data`: `file`, `name`, `url` oraz opcjonalnie `licenseId`, `attribution`, JSON-owe `mapping` i `referenceScope`, `submissionMethod`. |
| `POST /api/moderation/source/{id}` | JSON `{"status":"approved"}`, `"blocked"` albo `"needs_review"`. |
| `POST /api/moderation/{id}` | JSON `{"decision":"approved","reason":"..."}` lub decyzja `rejected`; uzasadnienie ma maksymalnie 500 znaków. |
| `GET /api/moderation/{id}?stage=published` | Zwraca `record`, `version` i `deletionVersion`; zamiast `published` można wybrać `pending`. |
| `PATCH /api/moderation/{id}` | JSON zawiera `stage`, 64-znakową szesnastkową `version` i niepuste `changes` z dozwolonymi polami. |
| `DELETE /api/moderation/{id}` | JSON z `stage` i `version`; klient używa wersji usunięcia otrzymanej przy pobraniu rekordu. |
| `POST /api/moderation/merge` | JSON z UUID `survivingRecordId`, `mergedRecordId` i uzasadnieniem `reason` o długości 5–500 znaków. |

Odpowiedzi błędów zwykle mają postać `{"error":"..."}`. W zależności od operacji występują m.in. `400` dla błędnych danych, `401` dla braku uprawnień, `404` dla nieznanego zasobu, `409` dla konfliktu stanu, `413` dla zbyt dużego pliku, `415` dla nieobsługiwanego formatu oraz `502` dla nieudanego pobrania źródła. `POST /api/import` może zwrócić `201` i `accepted: 0`, jeśli żaden rekord nie przeszedł walidacji; nie zapisuje wówczas pustego źródła.

## 19. Limity techniczne i zasady prezentacji

- Import pliku: 5 MiB; kontrola długości żądania uwzględnia dodatkowe 32 000 bajtów metadanych. XLSX dodatkowo ogranicza archiwum do 300 wpisów, 20 MiB po rozpakowaniu i współczynnika rozszerzenia 100 dla wpisu.
- Konektory: do 8 MiB typowego zasobu publicznego oraz 20 MiB krajowego GeoJSON; do trzech przekierowań na dozwolonym hoście HTTPS. Standardowy limit żądania to 20 sekund, a zapytanie Overpass ma 85 sekund. Limity dotyczą konkretnych operacji, nie gwarantują stałej dostępności źródła.
- Wskaźnik świeżości korzysta z daty pobrania, deklarowanej częstotliwości i dostępnej daty danych. Progi dni dla stanu dobrego / wymagającego uwagi wynoszą odpowiednio 2/7 dla danych codziennych, 9/21 dla tygodniowych, 45/90 dla miesięcznych i 30/90 dla pozostałych. Stary zasób nie staje się aktualny tylko dlatego, że pobrano go ponownie.
- `publicRecords` ukrywa rekordy o statusie `removed` i `temporarily_removed` oraz wymaga spełnienia warunków źródeł. Jeśli istnieją widoczne rekordy rzeczywiste, nie pokazuje zestawu wyłącznie demonstracyjnego. `exportableRecords` stosuje osobny filtr licencji i źródeł niesyntetycznych; sama funkcja eksportu nie filtruje statusów `recordStatus` w taki sam sposób jak widok publiczny.
- Źródła OSM i OpenAEDMap są powiązane pochodzeniem. Krajowe pobieranie OSM wymaga zainstalowanego indeksu OpenAEDMap. Ograniczenie to nie jest dowodem kompletności ani niezależnego potwierdzenia.
- Klucz nie tworzy sesji ani konta; po przejęciu klucza użytkownik ma uprawnienia administratora. Prototyp nie implementuje logowania wieloskładnikowego ani ograniczania częstotliwości żądań. Zmienna `AED_ADMIN_TOKEN` musi zostać ustawiona; jej brak blokuje dostęp administracyjny.
