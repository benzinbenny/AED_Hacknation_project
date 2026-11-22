# Struktura katalogów projektu Punkt Życia

Dokument opisuje katalogi znajdujące się w projekcie oraz ich przeznaczenie. Drzewo pokazuje katalogi własne projektu i najważniejsze katalogi generowane; nie rozwija tysięcy plików bibliotek ani zawartości tymczasowej. Stan: 22 listopada 2026 r. Nazwy katalogów generowanych mogą się zmieniać.

```text
Projekt_Haknation/
├── app/                         Strony, układ i interfejsy API Next.js
│   ├── api/
│   │   ├── aed/
│   │   │   └── [id]/            Szczegóły pojedynczego AED
│   │   ├── collect/[sourceId]/  Pobieranie danych wybranego źródła
│   │   ├── export/[format]/     Eksport danych w wybranym formacie
│   │   ├── import/              Przyjmowanie zgłoszeń i plików
│   │   ├── metadata/            Metadane zbioru
│   │   ├── moderation/
│   │   │   ├── [id]/check/     Sprawdzenie rekordu u źródła
│   │   │   ├── discover/        Wyszukiwanie zbiorów
│   │   │   ├── merge/[id]/undo/ Cofanie scalenia
│   │   │   ├── source/[id]/     Ocena licencji źródła
│   │   │   └── sources/[sourceId]/installation/
│   │   └── standard/            Udostępnienie standardu danych
│   ├── dodaj/                   Formularz dodawania danych
│   ├── kampania/                Strona kampanii
│   ├── moderacja/               Panel administratora
│   ├── standard/                Opis standardu danych
│   └── zrodla/                  Publiczny wykaz źródeł
├── artifacts/                   Materiały projektu do wykorzystania
│   ├── brand/                   Logo i księga znaku
│   ├── presentation/            Prezentacje
│   ├── screenshots/             Zrzuty ekranu aplikacji
│   └── submission/              Materiały zgłoszeniowe, m.in. arkusz XLSX
├── docs/                        Dokumentacja projektu
│   └── superpowers/
│       ├── plans/               Plany prac
│       └── specs/               Opisy założeń projektowych
├── e2e/                         Testy aplikacji w przeglądarce
│   └── fixtures/                Przykładowe dane do testów
├── public/                      Pliki statyczne dostępne na stronie
├── scripts/                     Skrypty pomocnicze projektu
├── src/                         Logika aplikacji i komponenty
│   ├── components/
│   │   └── moderation/          Elementy panelu administratora
│   ├── data/                    Dane demonstracyjne
│   ├── domain/                  Model AED i reguły dziedzinowe
│   ├── export/                  Przygotowanie eksportu danych
│   ├── import/                  Odczyt i normalizacja plików
│   ├── services/                Moderacja, uprawnienia i operacje na danych
│   ├── sources/
│   │   └── osm/                 Obsługa zapytań OpenStreetMap
│   └── storage/                 Zapis i odczyt lokalnej bazy
├── .data/                       Lokalna baza aplikacji
├── node_modules/                Zainstalowane biblioteki
├── .next*/                      Wyniki uruchomienia, kompilacji i testów Next.js
├── .build/                      Pomocnicze pliki generowane podczas budowania
├── .npm-cache/                  Lokalna pamięć podręczna npm
└── test-results/                Wyniki i załączniki testów przeglądarkowych
```

## Pliki w katalogu głównym

`README.md` zawiera podstawowe informacje o projekcie i uruchomieniu. `package.json` określa zależności i dostępne polecenia, a `package-lock.json` utrwala wersje bibliotek. Pliki `next.config.ts`, `tsconfig.json`, `vitest.config.ts` oraz `playwright*.config.ts` konfigurują odpowiednio aplikację, TypeScript i testy. `AGENTS.md` zawiera instrukcje dla osób i narzędzi pracujących z kodem. `.env.example` pokazuje przykładową konfigurację, natomiast `.env.local` zawiera ustawienia lokalne i może zawierać poufne dane. `next-env.d.ts` i `tsconfig.tsbuildinfo` są plikami pomocniczymi narzędzi.

## Gdzie szukać informacji

- Kod konkretnej strony znajduje się w `app/`, a jej większe komponenty i logika zwykle w `src/`.
- Opis techniczny znajduje się w `docs/opis-techniczny-aplikacji.md`; pozostałe dokumenty w `docs/` opisują m.in. wymagania, standard i źródła.
- Dane lokalne w `.data/` nie są katalogiem kodu. Nie należy ich usuwać podczas porządkowania, jeśli mają zostać zachowane zgłoszenia, źródła i historia pracy.
- `node_modules/`, katalogi `.next*`, `.build/`, `.npm-cache/` i `test-results/` zawierają zależności lub wyniki generowane; ich zawartość nie jest kompletna w powyższym drzewie. W zależności od uruchomień mogą pojawiać się dodatkowe katalogi tymczasowe.

Nazwy w nawiasach kwadratowych, np. `[id]` i `[sourceId]`, oznaczają parametry adresu w Next.js, a nie pojedyncze identyfikatory urządzeń lub źródeł.
