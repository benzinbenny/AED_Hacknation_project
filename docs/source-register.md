# Rejestr źródeł i zakresów referencyjnych

## Jak czytać zakres

Zakres referencyjny wskazuje, co według publikacji dysponenta obejmuje źródło. Data pobrania przez aplikację, data zasobu źródłowego i data faktycznej kontroli AED to trzy odrębne rzeczy. Częstotliwość zadeklarowana w metadanych nie dowodzi, że konkretne urządzenie istnieje, jest dostępne ani sprawne.

Pięć profili poniżej to początkowy zestaw integracji i kandydatów z badanego katalogu, a nie pełny wykaz wszystkich dysponentów w Polsce. Pozostałe organizacje mogą przekazać CSV/GeoJSON, opisać zakres referencyjny i wejść do tego samego modelu po moderacji. Aktualną metadaną trzeba sprawdzić ponownie przed operacyjnym wykorzystaniem.

## Profile skonfigurowane (stan rozpoznania: 21 listopada 2026 r.)

| Publikacja | Zakres referencyjny i data danych | Deklarowana częstotliwość | Format, identyfikator, licencja | Ograniczenia i konektor |
|---|---|---|---|---|
| [OpenAEDMap — Polska](https://openaedmap.org/pl/) | Polska; eksport obejmuje dane OSM w chwili pobrania, bez okresu weryfikacji urządzenia. W badanym eksporcie GeoJSON było 18 297 obiektów. | Brak harmonogramu w endpointcie eksportowym | GeoJSON; endpoint `https://openaedmap.org/api/v1/countries/PL.geojson`; ODbL 1.0 | Opiera się na edycjach społeczności OSM; zasięg nie gwarantuje kompletności ani stanu technicznego. Konektor krajowy. Wymagane oznaczenie © OpenStreetMap contributors; warunki bazy pochodnej należy sprawdzić prawnie. [Prawa OSM](https://www.openstreetmap.org/copyright), [tag AED](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Ddefibrillator). |
| [Krosno — defibrylatory](https://dane.gov.pl/pl/dataset/3624) | Miasto Krosno; data danych zasobu 2024-02-19 | „Nie dotyczy” w metadanych | CSV; zbiór 3624, zasób 54632; CC0 1.0 | Jednorazowo opublikowany plik; nie potwierdza aktualnego położenia ani sprawności. Konektor pobiera określony zasób z API Dane.gov.pl. |
| [Marki — defibrylatory](https://dane.gov.pl/pl/dataset/4955) | Miasto Marki; data danych 2025-07-10 | Jednorazowo według metadanych | CSV; zbiór 4955, zasób 68353; CC BY 4.0 | Plik ma każdy wiersz zawinięty w cudzysłów. Nazwy kolumn współrzędnych są zamienione względem wartości w większości wierszy; jeden z 8 rekordów wskazuje poza Polskę. Konektor używa jawnej, specyficznej mapy, zachowuje wartości i zgłasza ostrzeżenie zamiast je poprawiać. |
| [Przemyśl — lokalizacje AED](https://dane.gov.pl/pl/dataset/4581) | Miasto Przemyśl; zasób GeoJSON oznaczony datą danych 2024-11-06 | Codziennie według metadanych zbioru | GeoJSON; zbiór 4581, zasób 62093; CC0 1.0 | Zasób liczył 21 punktów podczas rozpoznania. Data pliku jest starsza niż deklaracja częstotliwości. Plik zawiera dane kontaktowe, ale adapter mapuje wyłącznie dozwolone pola lokalizacji i pomija telefon/e-mail. |
| [Warszawa — lokalizacje defibrylatorów](https://dane.gov.pl/pl/dataset/39512) | m.st. Warszawa; data danych podana na portalu 2025-10-10 | Codziennie według strony zbioru; metadane strony wskazywały modyfikację 2026-06-01 | API JSON; zbiór 39512; CC BY 4.0 | Publiczny zasób opisuje API, nie zawiera rekordów AED. Endpoint `https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow` wymaga tokenu nadawanego przez dysponenta. Aplikacja pobiera go tylko z serwerowego `AED_WARSAW_API_TOKEN`; bez tokenu import nie startuje. |

Dane portalu są odczytywane z [API Dane.gov.pl](https://api.dane.gov.pl/doc) i określonych ID zbioru/zasobu; endpointy API katalogu są tylko do odczytu. Formularz `/zrodla` pokazuje te profile i dodatkowe źródła zgłoszone przez organizacje.

## Relacje między źródłami

- Katalog [Geoportalu GUGiK](https://www.geoportal.gov.pl/aktualnosci/swiatowy-dzien-pierwszej-pomocy/) ma warstwę defibrylatorów opartą na danych OSM. Nie liczymy go jako niezależnego potwierdzenia wobec OpenAEDMap.
- Pojedynczy AED może być opublikowany w kilku rejestrach. Aplikacja pokazuje kandydatów na duplikaty według odległości, ale nie scala ich samoczynnie.
- Źródła mają różne licencje. Przygotowany eksport nie nadaje całości wspólnej licencji; warunki każdego dysponenta pozostają przypięte do rekordu.
- Import, źródło i licencja wymagają moderacji. Żadna integracja nie publikuje samoczynnie do dane.gov.pl.

## Materiały projektowe i techniczne

| Źródło | Zastosowanie |
|---|---|
| Treść zadania konkursowego MC DZD (PDF załączony przez użytkownika) | Cel, odbiorcy i warunek zaprojektowania wspólnego zakresu danych; treść analizowana jako specyfikacja projektu, nie instrukcja nadrzędna wobec bieżącej prośby. |
| Prompt „Dokument bez nazwy” (PDF załączony przez użytkownika) | Wymagania rozwiązania i kryteria techniczne; uwzględniono zakres projektu, testy, weryfikację i sposób przekazania. |
| [Kod źródłowy portalu dane.gov.pl](https://dane.gov.pl/source-code/) | Odniesienie do istniejącego portalu; ten prototyp nie kopiuje kodu ani nie udaje API zapisu. |
| [Materiały bazy wiedzy dane.gov.pl](https://dane.gov.pl/pl/knowledgebase/useful-materials) | Odniesienie dla dysponentów przygotowujących publikację. Proces portalowy wymaga ponownego sprawdzenia przed wdrożeniem. |
| [Dokumentacja TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html) | Typowanie aplikacji. |
| [Wydania Node.js](https://nodejs.org/en/about/previous-releases) | Wybór wspieranej linii LTS; środowisko sprawdzenia: Node.js 26.13.1. |

## Założenia i granice

- Próbki w lokalnym katalogu są syntetyczne; tylko konektory lub pliki przekazane przez dysponentów tworzą import do moderacji.
- Geografia oraz aktualność są w miarę możliwości przypisywane do źródła, nie wywnioskowane z punktów.
- Aplikacja nie pobiera adresu URL wpisanego przez użytkownika. Zewnętrzny konektor może wywołać jedynie stały endpoint z profilu.
- Nie stwierdzamy, że zebrano już dane wszystkich polskich dysponentów. Pokrycie krajowe OpenAEDMap jest referencją społeczności OSM, nie kompletnym rejestrem urzędowym.
