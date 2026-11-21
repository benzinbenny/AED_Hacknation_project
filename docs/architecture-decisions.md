# Decyzje architektoniczne

## Kierunek

Prototyp jest aplikacją webową z wydzielonym modelem domenowym TypeScript. Użytkownik korzysta z przeglądarki; reguły normalizacji, importu, jakości, moderacji i eksportu pozostają w modułach serwerowych poza komponentami interfejsu.

## Dlaczego TypeScript i Next.js

- TypeScript wykrywa część błędów integracji pól i statusów przed wdrożeniem; Zod waliduje dane na granicach systemu w czasie działania.
- React/Next.js łączy katalog publiczny z trasami API w jednym utrzymywalnym projekcie.
- Separacja `domain`, `import`, `services`, `storage`, `export` i `app` umożliwia wymianę warstwy HTTP lub magazynu bez przepisywania modelu danych.
- Zależności są przypięte w `package-lock.json`; w automatyzacji używamy `npm ci`.
- Wspieramy utrzymywane linie LTS, a nie Alpha/Current: `package.json` ogranicza silnik do Node 24–26. Projekt jest sprawdzany na Node 26 LTS. Zakres aktualizujemy wraz z harmonogramem Node.js.

## Magazyn

Interfejs `AedRepository` oddziela logikę przypadków użycia od JSON-owego adaptera `JsonFileRepository`. Adapter zapisuje plik przez zapis tymczasowy i zmianę nazwy, waliduje stan Zodem i szereguje zapisy w ramach procesu.

To rozwiązanie pozwala uruchomić prototyp bez infrastruktury, ale nie jest wieloprocesowe ani transakcyjne. W docelowej usłudze należy zastąpić adapter magazynem PostgreSQL z migracjami, unikalnymi ograniczeniami, transakcjami i audytem.

## Model danych i import

- `AedRecord` jest kanonicznym rekordem ze współrzędnymi WGS84 i co najmniej jedną referencją źródłową.
- `unknown` jest prawidłową, jawną wartością. Brak harmonogramu, statusu lub dostępu nie jest uzupełniany domysłem.
- Import GeoJSON przyjmuje punkty; w pliku GeoJSON współrzędne pozostają w kolejności `[longitude, latitude]`.
- CSV umożliwia mapowanie nagłówków, separator jest wykrywany automatycznie, a BOM jest obsługiwany.
- Walidator nie zamienia współrzędnych automatycznie. Punkty poza przybliżonym zakresem Polski otrzymują ostrzeżenie.
- SHA-256 surowego rekordu i metadane źródła umożliwiają porównanie tego, co importer przetworzył.

## Licencje, moderacja i eksport

- Import trafia do `pendingRecords`; rejestr źródeł otrzymuje stan `needs_review`.
- Moderator rozpatruje licencję przed decyzją o publikacji rekordu.
- Eksporty zawierają tylko rekordy źródeł zatwierdzonych, nie-syntetycznych i z niepustą licencją.
- Porównanie odległości tworzy kandydatów. Scalenie jest decyzją moderatora, zachowuje oba źródła i ma operację cofnięcia.
- CSV neutralizuje tekst zaczynający się od znaków typowych dla formuł arkusza; wartości numeryczne pozostają liczbami.

## Federacja źródeł

- `src/sources/catalog.ts` utrzymuje allowlistę profili. Każdy profil określa dysponenta, licencję, pierwotne pochodzenie, zakres geograficzny i czasowy, deklarowaną częstotliwość, ograniczenia i dokładny endpoint/ID zasobu.
- Adaptery są specyficzne dla opublikowanego formatu. Konektor Dane.gov.pl weryfikuje ID zbioru, zasobu, format i host pobrania w API katalogowym; nie wybiera przypadkowego pliku z kolekcji.
- Moderator uruchamia pobieranie z panelu. Serwer ogranicza czas i rozmiar odpowiedzi, sprawdza przekierowania i stage'uje dane atomowo dopiero po zakończeniu normalizacji.
- Wszystkie rekordy trafiają do kolejki. Zatwierdzanie licencji i danych jest osobne; pochodzenie każdej obserwacji jest zachowane.
- Brak katalogu wszystkich dysponentów w Polsce rozwiązujemy przez otwarty import plików od pozostałych organizacji i dopisywanie jawnych profili. Widok OpenAEDMap i warstwa Geoportalu oparte na OSM nie są traktowane jako niezależne potwierdzenia.

## Interfejs

Leaflet + kafelki OpenStreetMap to niedrogie rozwiązanie demonstracyjne. Lista jest równorzędnym, wyszukiwalnym widokiem, więc podstawowy użytek działa, gdy mapa lub sieć są niedostępne. Docelowa mapa powinna korzystać z zatwierdzonego dostawcy, limitów i polityki prywatności wdrożenia.

## Świadomie poza zakresem prototypu

Brak bezpośredniego zapisu do dane.gov.pl, pełnego katalogu każdego polskiego dysponenta, kont użytkowników, federacyjnego logowania, harmonogramu automatycznych pobrań, walidacji TERYT przez referencyjny rejestr, powiadomień, systemu dyżurnego, telemetrii operacyjnej i gwarancji aktualności lokalizacji. Konektory wymagające sekretu (Warszawa) potrzebują uprawnienia dysponenta i konfiguracji poza repozytorium. Funkcje produkcyjne wymagają umów z dysponentami, decyzji prawnych i infrastruktury wieloużytkownikowej.
