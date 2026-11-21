# Projekt Punkt Życia — projekt rozbudowy danych AED

## Cel

Rozwinąć istniejący prototyp Punkt Życia w przejrzyste narzędzie dla dysponentów danych AED. Aplikacja ma zachęcać do przekazywania danych do publikacji w dane.gov.pl, przyjmować wspólny wzorzec XLSX, pokazywać zakres i świeżość źródeł oraz przygotowywać otwarte dane i metadane publikacyjne.

## Dlaczego

Sama mapa AED nie wyjaśnia, skąd pochodzi informacja, jakiego obszaru dotyczy ani kiedy została pozyskana. Dla użytkownika publicznego, dysponenta i operatora danych najważniejsze są: przejrzyste pochodzenie, uczciwe oznaczenie ograniczeń, wspólny format oraz kontrola przed publikacją.

## Cele

- Pokazać proces: dysponent → walidacja → moderacja → otwarte dane → publikacja przez uprawniony podmiot.
- Dodać do katalogu źródeł widoczny obraz pokrycia oraz bieżący status pobrania i świeżości.
- Przyjmować CSV, GeoJSON oraz arkusz `Dane_AED` ze wzorcowego XLSX.
- Udostępniać maszynowo odczytywalne metadane JSON-LD dla paczki publikacyjnej.
- Wzmocnić dostępność: skip link, osiągalne z klawiatury tabele i mapa, poprawne nazwy linków zewnętrznych, obsługa ograniczenia ruchu.
- Dodać testy automatyczne dla logiki świeżości, importu XLSX, metadanych i kluczowych widoków mobilnych/dostępności.
- Utrzymać rzetelne ograniczenia: brak automatycznego zapisu do dane.gov.pl, brak deklaracji pełnego pokrycia kraju i brak twierdzenia o sprawności AED bez potwierdzenia.

## Poza zakresem tej iteracji

- Automatyczne publikowanie lub zapisywanie danych w dane.gov.pl.
- Pozyskanie wszystkich rzeczywistych źródeł w Polsce bez ich zgody i uprawnień.
- Zastąpienie demonstracyjnego magazynu JSON produkcyjną bazą PostgreSQL.
- Deklaracja formalnej zgodności WCAG 2.2 AA bez niezależnego testu manualnego z czytnikiem ekranu.

## Podejścia rozważone

1. **Wyłącznie opis przyszłej architektury.** Najszybsze, ale nie dowodzi działania wymaganych procesów w prototypie.
2. **Zastąpienie aplikacji nowym portalem.** Pozwoliłoby dowolnie zmienić interfejs, ale straciłoby gotowy model importu, moderacji i eksportu.
3. **Rozbudowa istniejącego prototypu o kontrakt danych i przejrzystość źródeł.** Wybrane podejście: zachowuje działający model domenowy, dostarcza widocznych dowodów wymagań konkursowych i wyznacza bezpieczną drogę do wdrożenia produkcyjnego.

## Projekt rozwiązania

### Dane i źródła

Nowa, czysta funkcja domenowa oceni stan źródła na podstawie ostatniego pobrania, daty danych oraz deklarowanej częstotliwości. Wynik ma wartości `fresh`, `attention`, `stale`, `reference` i `not_collected`; nie jest oceną sprawności AED. Katalog źródeł pokaże podsumowanie pokrycia (krajowe, lokalne i zgłoszone przez dysponentów) oraz status każdego profilu.

### Przekazywanie danych

Import XLSX obsłuży wyłącznie arkusz `Dane_AED` pobrany ze standardu. Nagłówki są kanonicznym kontraktem; wiersze są mapowane do tego samego importu GeoJSON, więc zachowują identyczną walidację współrzędnych, identyfikatorów, licencji i pochodzenia jak CSV/GeoJSON. Plik nie będzie wykonywał formuł ani odczytywał innych arkuszy jako danych AED.

### Publikacja

Endpoint JSON-LD zwróci opis zbioru, wersję standardu, dostępne dystrybucje CSV/JSON/GeoJSON/XLSX i opis ograniczeń publikacji. Będzie to paczka przygotowawcza dla podmiotu posiadającego konto i uprawnienia w dane.gov.pl, a nie symulacja API zapisu.

### Kampania i UX

Kampania użyje obecnego znaku Punkt Życia i hasła „Misja AED · Dane na ratunek”, rozszerzonego jasnym wezwaniem: „Masz dane o AED? Udostępnij je raz. Ratuj minuty wspólnie.” Animacja przepływu danych będzie dekoracyjna, uruchamiana tylko przy `prefers-reduced-motion: no-preference`. Trzy kroki przeprowadzą dysponenta od wzorca XLSX do publikacji.

### Dostępność i mobilność

Każda strona otrzyma skip link do `main#main-content`. Tabele będą dostępne jako opisane regiony klawiaturowe, mapa dostanie nazwę oraz opis z odwołaniem do pełnej listy, a linki otwierane w nowej karcie będą komunikować ten fakt. Testy Axe oraz widoki 375 px, 768 px i desktop dadzą automatyczny dowód części kryteriów; dokumentacja oddzieli je od potrzebnej kontroli manualnej.

## Przyszłościowa ścieżka produkcyjna

Interfejs repozytorium pozostaje granicą migracji do PostgreSQL. Następny etap powinien użyć transakcyjnej bazy, ról operatorów, kolejki harmonogramów pobrań, wersjonowanych adapterów, monitoringu awarii, retencji historii i podpisanych zdarzeń audytowych. Format wymiany pozostaje niezależny od dostawcy bazy i widoku aplikacji.

## Decyzje wykonawcze

- Zachowujemy TypeScript, Next.js 16 App Router, React 19, Zod i ExcelJS, ponieważ są już użyte i testowane w projekcie.
- Nie wprowadzamy nowej biblioteki animacji; CSS zmniejsza koszt pakietu i umożliwia pewne wyłączenie ruchu.
- Wprowadzamy XLSX przez istniejący serwerowy import, aby format wzorcowy dawał zamknięty obieg: pobierz → wypełnij → przekaż → moderuj.
- Zgoda użytkownika na wykonanie wynika z bieżącego polecenia rozbudowy aplikacji zgodnie z wytycznymi konkursowymi.
