# Scenariusz demonstracji (4–6 minut)

1. Otwórz katalog i przeczytaj baner: widoczne punkty są syntetyczne, więc nie należy traktować ich jako rzeczywistych lokalizacji.
2. Wpisz „budynek A”, odfiltruj punkty publiczne, przełącz listę i mapę. Pokaż listę jako niezależny widok.
3. Otwórz szczegóły urządzenia. Zwróć uwagę na status `unknown`, surowe godziny i ślad źródłowy.
4. W „Dodaj dane” wybierz „Jeden AED” na telefonie albo „Import pliku”. Przy CSV sprawdź przypisanie współrzędnych, podaj nazwę i adres źródła, a po wysłaniu odczytaj raport.
5. Otwórz „Źródła danych”, porównaj zakres i daty Krosna, Marek, Przemyśla oraz eksportu krajowego. Zwróć uwagę, że zakres i data importu nie potwierdzają sprawności AED.
6. W panelu moderacji wybierz kafelek „Źródła”. Otwórz zainstalowane źródła, sprawdź datę ostatniego importu i pobierz wybrany zbiór. W „Do moderacji” możesz sprawdzić licencję i rozpatrzyć wpis.
7. Otwórz „Zatwierdzone AED” i porównaj wpis z aktualną publikacją dysponenta. Klucz administratora odsłania także usunięcie urządzenia z potwierdzeniem. Kafelek „Historia i scalenia” zawiera kandydatów na duplikaty i ślad decyzji.
8. Otwórz „Standard danych” i pobierz XLSX. Pokaż TERYT, dostęp, weryfikację, zakres źródła i przykłady błędów.
9. Pokaż ograniczenie: eksport CSV/JSON/GeoJSON jest paczką do dalszej publikacji przez uprawniony podmiot; aplikacja nie zapisuje do dane.gov.pl.

## Reset demonstracji

Zatrzymaj serwer, usuń `.data/aed-store.json` i uruchom ponownie. Aplikacja odtworzy cztery fikcyjne rekordy demonstracyjne.
