# Punkt Życia — zamysł i działanie funkcji

Stan: 22 listopada 2026 r. Dokument opisuje funkcje obecne w projekcie. Szczegółowe informacje o modelu danych, endpointach i ograniczeniach technicznych znajdują się w [opisie technicznym](opis-techniczny-aplikacji.md).

## Cel aplikacji

Punkt Życia jest prototypem wspierającym zbieranie danych o defibrylatorach AED z różnych źródeł, sprowadzanie ich do wspólnego modelu, sprawdzanie przez administratora i przygotowanie do publikacji. Ma pomóc wykrywać braki i pokazywać pochodzenie danych. Sama aplikacja nie publikuje danych w dane.gov.pl i nie potwierdza, że urządzenie jest obecnie sprawne lub dostępne.

## Katalog AED i mapa

**Zamysł:** umożliwić przeglądanie zatwierdzonych danych w jednym miejscu, zarówno na mapie, jak i w formie listy.

**Działanie:** strona główna pokazuje dostępne publicznie rekordy, umożliwia ich wyszukiwanie i filtrowanie oraz wyświetla informacje o lokalizacji i pochodzeniu. Mapa wymaga dostępu do kafelków mapowych. Gdy nie ma widocznych danych rzeczywistych, mogą być pokazywane dane demonstracyjne. Sam znacznik na mapie nie jest potwierdzeniem dostępności urządzenia.

## Dodanie jednego AED

**Zamysł:** pozwolić przekazać informację o pojedynczym urządzeniu bez przygotowywania arkusza.

**Działanie:** na stronie „Dodaj dane” użytkownik wybiera „Jeden AED”, podaje wymagane dane źródła, identyfikator oraz współrzędne i może uzupełnić pozostałe informacje. Zgłoszenie trafia do kolejki oczekujących. Przed publikacją administrator musi ocenić licencję źródła i zatwierdzić rekord.

## Przekazanie pliku

**Zamysł:** umożliwić organizacji przekazanie wielu lokalizacji jednocześnie w formacie odczytywalnym maszynowo.

**Działanie:** formularz przyjmuje CSV, GeoJSON/JSON lub wzorcowy XLSX. Przy CSV można przypisać kolumny do pól aplikacji. Import sprawdza format, identyfikatory i współrzędne oraz pokazuje liczbę przyjętych i odrzuconych wpisów. Poprawne rekordy trafiają do moderacji, a nie od razu do publicznego katalogu. Maksymalny rozmiar pliku wynosi 5 MiB.

## Wyszukiwanie źródeł

**Zamysł:** ułatwić administratorowi znalezienie zbiorów, które mogą zawierać dane o AED.

**Działanie:** przycisk „Odśwież publiczne źródła” przeszukuje katalog dane.gov.pl według określonych fraz. Nowo odnalezione zbiory są zapisywane w zakładce „Do zainstalowania”. Źródła już zainstalowane lub znajdujące się w usuniętych zachowują swój stan. Wyszukiwanie nie obejmuje całego internetu i nie potwierdza, że zbiór jest kompletny lub nadaje się do ponownego wykorzystania.

## Instalowanie, pobieranie i usuwanie źródeł

**Zamysł:** oddzielić decyzję o użyciu źródła od pobierania jego danych i dać administratorowi kontrolę nad rejestrem.

**Działanie:**

1. W „Do zainstalowania” administrator może zainstalować źródło albo je usunąć.
2. W „Zainstalowane źródła” przycisk „Pobierz dane” jest dostępny dla źródeł z obsługiwanym konektorem. Pobrane rekordy trafiają do kolejki moderacji.
3. Odinstalowanie przenosi źródło do „Do zainstalowania” i zachowuje wcześniejsze rekordy oraz historię.
4. Usunięcie przenosi źródło do „Usunięte źródła” i usuwa powiązane rekordy AED, również objęte aktywnym scaleniem. W tej zakładce można następnie usunąć źródło trwale.

Trwale usunięty zbiór może pojawić się ponownie po wyszukaniu, jeżeli jest nadal odnajdywany w dane.gov.pl. Plik przesłany ręcznie lub dane demonstracyjne nie są wyszukiwane w tym katalogu. Odnalezienie źródła nie oznacza automatycznego pobrania ani zatwierdzenia rekordów.

## Pobieranie danych ze źródeł

**Zamysł:** ograniczyć ręczne przepisywanie danych z dostępnych rejestrów i zachować informację o ich pochodzeniu.

**Działanie:** aplikacja ma skonfigurowane konektory m.in. dla OpenStreetMap, OpenAEDMap oraz wybranych zbiorów lokalnych; konektor Warszawy wymaga osobnego tokenu. Nowo odkryte zbiory dane.gov.pl mogą być pobierane, jeżeli zawierają obsługiwany GeoJSON Point albo CSV z rozpoznawalnymi kolumnami współrzędnych. Inne zasoby mogą wymagać ręcznego importu. OSM i OpenAEDMap mają wspólne pochodzenie danych i nie stanowią niezależnego potwierdzenia.

## Moderacja i licencje

**Zamysł:** przed upublicznieniem dać administratorowi możliwość oceny pochodzenia, warunków wykorzystania i jakości informacji.

**Działanie:** w panelu „Do moderacji” administrator przegląda oczekujące wpisy, wyszukuje je i filtruje według źródła lub sposobu dodania. Osobno ocenia status licencji źródła, a następnie zatwierdza lub odrzuca rekord. Decyzje są zapisywane w historii. Sama poprawność techniczna importu nie stanowi potwierdzenia prawdziwości danych ani prawa do ich publikacji.

## Edycja, kontrola i usuwanie AED

**Zamysł:** umożliwić poprawienie lub wycofanie błędnych wpisów bez zmiany oryginalnego źródła zewnętrznego.

**Działanie:** administrator może poprawić m.in. nazwę, adres, współrzędne, dostęp i zgłoszony stan urządzenia. Korekta jest zachowywana lokalnie i uwzględniana przy kolejnym imporcie. Sprawdzenie źródła porównuje dostępne informacje, ale samo nie nadpisuje wpisu. Usunięcie wycofuje rekord z lokalnego katalogu i kolejki; późniejsze ponowne zgłoszenie lub import może ponownie skierować go do moderacji.

## Podobne wpisy, scalanie i historia

**Zamysł:** pomóc rozpoznać sytuację, w której różne źródła opisują ten sam AED, i zachować możliwość prześledzenia decyzji.

**Działanie:** aplikacja wskazuje kandydatów znajdujących się blisko siebie; odległość sama nie dowodzi, że chodzi o jedno urządzenie. Administrator decyduje o scaleniu dwóch zatwierdzonych rekordów i podaje uzasadnienie. Referencje źródłowe są zachowywane, a historia pozwala cofnąć dopuszczalne scalenie. Późniejsze zależne scalenia lub usunięcie wpisu mogą uniemożliwić cofnięcie. Historia pokazuje także importy i decyzje.

## Źródła i świeżość

**Zamysł:** pokazać, skąd pochodzą dane, jaki zakres deklaruje źródło i kiedy były pobrane.

**Działanie:** rejestr prezentuje dostępne informacje o zasięgu, licencji, dacie i częstotliwości aktualizacji. Wskaźnik świeżości porównuje dostępne daty z przyjętymi progami. Niedawne pobranie starego pliku nie potwierdza aktualności zawartych w nim danych.

## Standard, eksport i kampania

**Zamysł:** ułatwić organizacjom przekazywanie porównywalnych danych i przygotowanie materiału dla wydawcy danych otwartych.

**Działanie:** strona „Standard danych” opisuje model i udostępnia wzorcowy arkusz XLSX. Aplikacja przygotowuje eksport CSV, JSON i GeoJSON oraz metadane JSON-LD dla rekordów spełniających warunki eksportu. Publikację w dane.gov.pl wykonuje poza aplikacją uprawniony podmiot. Strona kampanii przedstawia hasło, znak i sposób przekazania danych.

## Granice rozwiązania

Aplikacja jest prototypem, a lokalny plik JSON i pojedynczy klucz administratora nie zastępują produkcyjnej bazy, indywidualnych kont, kopii zapasowych ani monitoringu. Zbiór nie obejmuje automatycznie wszystkich dysponentów AED. Dostępność i sprawność każdego urządzenia wymagają odrębnego potwierdzenia. W sytuacji zagrożenia należy dzwonić pod numer 112.

## Szczegółowy wykaz funkcji według widoków

Poniższy wykaz rozwija opis powyżej do poziomu elementów interfejsu i poszczególnych działań. Przyciski potwierdzające operację wykonują ją dopiero po potwierdzeniu; „Anuluj” zamyka dane potwierdzenie.

### Nawigacja

| Funkcja | Zamysł i działanie |
| --- | --- |
| Logo i nazwa | Powrót do strony głównej i katalogu AED. |
| Menu główne | Przejście do katalogu, dodawania danych, źródeł, standardu, kampanii i administracji. |
| Menu mobilne | Rozwijana wersja tej samej nawigacji na mniejszym ekranie. |
| Przejście do treści | Ułatwia pominięcie nawigacji osobie korzystającej z klawiatury. |

### Strona główna — katalog

| Funkcja | Zamysł i działanie |
| --- | --- |
| Przeglądaj punkty | Przenosi do części strony z wynikami. |
| Mam dane do dodania / Dodaj zestaw danych | Otwiera formularz przekazania danych. |
| Lista / Mapa | Przełącza sposób prezentacji wyników; dane podlegają tym samym wybranym filtrom. |
| Szukaj AED | Zawęża widoczne wpisy według tekstu, np. nazwy, adresu lub operatora. |
| Filtr dostępu | Pozwala zawęzić wyniki według rodzaju dostępu. |
| Karta rekordu i pochodzenie | Pokazuje dostępne szczegóły, oznaczenie danych źródłowych lub syntetycznych i informacje o źródle. |
| Poprzednia / Następna | Przełącza strony wyników na liście. |

### Dodaj dane — formularz i wynik

| Funkcja | Zamysł i działanie |
| --- | --- |
| Import pliku / Jeden AED | Wybór zgłoszenia pliku lub ręcznego wpisania jednego urządzenia. |
| Wybierz plik / Usuń plik | Wskazuje plik z urządzenia albo usuwa go z formularza przed wysłaniem; nie usuwa danych zapisanych wcześniej. |
| Dane urządzenia | Pozwala wpisać identyfikator, nazwę, adres i współrzędne; identyfikator i współrzędne są wymagane. |
| Dopasuj kolumny CSV | Pozwala powiązać pola aplikacji z nagłówkami pliku; szerokość i długość muszą wskazywać różne kolumny. |
| Pozostałe kolumny | Rozwija mapowanie dodatkowych danych, m.in. adresu, dostępu i oznaczeń TERYT. |
| Pochodzenie danych | Przyjmuje nazwę i adres źródła, a opcjonalnie licencję oraz wymagane oznaczenie. |
| Zakres źródła | Pozwala opisać geografię, okres, datę danych, częstotliwość, podstawę opisu i ograniczenia. |
| Sprawdź i dodaj do weryfikacji | Wysyła formularz do walidacji i zapisuje poprawne wpisy w kolejce. Wynik pokazuje przyjęcia, odrzucenia i ostrzeżenia. |
| Dodaj kolejne dane z tego źródła | Czyści wybrany plik lub dane pojedynczego urządzenia, umożliwiając kolejne zgłoszenie z zachowaniem kontekstu formularza. |
| Popraw zgłoszenie | Pozwala wrócić do formularza po odrzuceniu części danych. |

### Publiczna strona „Źródła danych”

| Funkcja | Zamysł i działanie |
| --- | --- |
| Podsumowanie zasięgu | Przedstawia informacje o źródłach i ich zakresie; nie dowodzi kompletności ogólnopolskiego zbioru. |
| Szukaj źródła | Zawęża wykaz tekstowo, m.in. według nazwy, dysponenta lub obszaru. |
| Zasięg | Przełącza wszystkie źródła, krajowe lub pozostałe. |
| Karta źródła | Pokazuje dostępne informacje o pochodzeniu, obszarze, czasie, ograniczeniach, licencji i świeżości. |
| Odnośnik publikacji źródłowej | Otwiera stronę dysponenta lub zbioru, aby umożliwić sprawdzenie informacji u źródła. |
| Źródła przekazane przez organizacje | Prezentuje źródła dodane przez zgłoszenia i ich status licencyjny. |

### Administracja — dostęp i wybór obszaru

| Funkcja | Zamysł i działanie |
| --- | --- |
| Klucz administratora / Otwórz kolejkę | Uwierzytelnia żądania i wczytuje dane panelu. |
| Kafelek Źródła | Otwiera zarządzanie źródłami i ich wyszukiwaniem. |
| Kafelek Zatwierdzone AED | Otwiera wyszukiwanie, edycję, kontrolę i usuwanie wpisów; formularz pozwala również wybrać wpisy oczekujące. |
| Kafelek Do moderacji | Otwiera kolejkę rekordów i ocenę źródeł. |
| Kafelek Historia i scalenia | Otwiera kandydatów na duplikaty oraz historię operacji. |

### Administracja — Źródła

| Funkcja | Zamysł i działanie |
| --- | --- |
| Odśwież publiczne źródła | Szuka zbiorów w dane.gov.pl i wyświetla wynik wyszukiwania; nowe źródła trafiają do dostępnych do instalacji. |
| Szukaj źródła | Zawęża kafelki po nazwie, obszarze lub formacie. |
| Zainstalowane / Do zainstalowania / Usunięte | Przełącza listy stanów i pokazuje liczbę źródeł w każdej z nich. |
| Publikacja źródłowa | Otwiera stronę źródła w nowej karcie. |
| Zainstaluj | Udostępnia źródło do obsługi i przenosi je na listę zainstalowanych. |
| Pobierz dane | Uruchamia konektor zainstalowanego źródła, jeżeli jest obsługiwany; nie zatwierdza pobranych AED. |
| Pobierz (wymaga tokenu) | Informuje, że dla danego konektora potrzebna jest dodatkowa konfiguracja po stronie serwera. |
| Odinstaluj / Potwierdź odinstalowanie | Wstrzymuje kolejne importy z danego źródła i przenosi je do instalacji; wpisy i historia pozostają. |
| Usuń źródło / Potwierdź usunięcie źródła i AED | Usuwa powiązane wersje AED i przenosi źródło do usuniętych; przed potwierdzeniem aplikacja pokazuje liczbę bezpośrednio powiązanych wpisów. |
| Usuń trwale / Potwierdź trwałe usunięcie | Usuwa źródło z listy usuniętych; historia pozostaje, a ponowne znalezienie zbioru zależy od dostępności w dane.gov.pl. |

### Administracja — AED i moderacja

| Funkcja | Zamysł i działanie |
| --- | --- |
| Zbiór wpisów | Wybiera rekordy zatwierdzone albo oczekujące do przeglądu i edycji. |
| Szukaj wpisu | Wyszukuje wpis po nazwie, adresie lub identyfikatorze. |
| Uzupełnij dane | Otwiera formularz edycji wybranego wpisu. |
| Zapisz zmiany | Zapisuje poprawki po sprawdzeniu wersji rekordu. |
| Anuluj edycję | Zamyka formularz bez zapisywania bieżących zmian. |
| Usuń AED / Usuń wpis / Potwierdź usunięcie | Rozpoczyna i potwierdza usunięcie rekordu z lokalnego katalogu i kolejki. |
| Odśwież u źródła / Sprawdź dane wpisu | Porównuje dostępne dane źródła lub nowszej wersji z wpisem; wynik nie jest automatyczną zmianą rekordu. |
| Szukaj oczekującego AED lub źródła | Pomaga znaleźć zgłoszenie po nazwie, adresie, identyfikatorze lub źródle. |
| Sposób dodania / Źródło | Filtruje kolejkę, ułatwiając odnalezienie zgłoszeń ręcznych, plikowych lub z konkretnego źródła. |
| Uzasadnienie decyzji | Pozwala dopisać opcjonalną informację do decyzji o rekordzie. |
| Zatwierdź rekord | Przenosi kwalifikujący się rekord do zatwierdzonych po ocenie wymaganych licencji. |
| Odrzuć | Odrzuca wersję oczekującą i zapisuje decyzję. |
| Zatwierdź licencję / Zablokuj | Zmienia status oceny źródła; przy braku identyfikatora licencji interfejs nie oferuje zatwierdzenia. |
| Poprzednia / Następna | Nawiguje między stronami wyników lub kolejki. |

### Administracja — historia i scalenia

| Funkcja | Zamysł i działanie |
| --- | --- |
| Podobne lokalizacje | Wyświetla kandydatów znalezionych na podstawie odległości, aby człowiek mógł ocenić podobieństwo. |
| Uzasadnienie scalenia | Zapisuje powód decyzji o połączeniu. |
| Zachowaj 1., scal 2. / Zachowaj 2., scal 1. | Łączy dwa zatwierdzone wpisy i pozwala wybrać identyfikator rekordu pozostającego. |
| Ostatnie importy i decyzje | Pokazuje ostatnie pozycje historii wraz z datami i wynikami; podgląd jest ograniczony. |
| Historia łączenia rekordów | Pokazuje ostatnie scalenia, cofnięcia i unieważnienia. |
| Cofnij scalenie | Próbuje przywrócić wcześniejsze rekordy, jeśli nie blokują tego późniejsze zależne operacje. |

### Standard i kampania

| Funkcja | Zamysł i działanie |
| --- | --- |
| Pobierz szablon XLSX | Pobiera wzorcowy arkusz do jednolitego przygotowania danych. |
| Eksport publiczny CSV / GeoJSON | Pobiera dane spełniające reguły eksportu w wybranym formacie. |
| Metadane JSON-LD | Udostępnia metadane paczki danych w formacie odczytywalnym maszynowo. |
| Eksport JSON | Jest dostępny jako osobny adres API `/api/export/json`. |
| Słownik pól | Wyjaśnia znaczenie wybranych wartości i zasad opisu. |
| Odnośniki dane.gov.pl | Prowadzą do kodu portalu i jego bazy wiedzy. |
| Strona Misja AED | Przedstawia hasło, ideę kampanii i kroki przekazania danych, z odnośnikami do standardu, formularza i źródeł. |
