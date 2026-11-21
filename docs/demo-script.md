# Scenariusz demonstracji (4–6 minut)

1. Otwórz katalog i przeczytaj baner: widoczne punkty są syntetyczne, więc nie należy traktować ich jako rzeczywistych lokalizacji.
2. Wpisz „budynek A”, odfiltruj punkty publiczne, przełącz listę i mapę. Pokaż listę jako niezależny widok.
3. Otwórz szczegóły urządzenia. Zwróć uwagę na status `unknown`, surowe godziny i ślad źródłowy.
4. Wejdź w „Dodaj dane”. Możesz wgrać własny nieosobowy plik CSV/GeoJSON do 5 MB i przejrzeć raport. Import nie staje się publiczny automatycznie.
5. Otwórz „Źródła danych”, porównaj zakres i daty Krosna, Marek, Przemyśla oraz eksportu krajowego. Zwróć uwagę, że zakres i data importu nie potwierdzają sprawności AED.
6. Otwórz „Moderacja”. Możesz uruchomić konektor; pobrane rekordy wymagają sprawdzenia licencji i osobnej decyzji. Warszawa wymaga serwerowego tokenu.
7. W kolejce pokaż kandydatów na duplikaty. Scalenie wymaga ręcznego wyboru, zachowuje pochodzenie, uzasadnienie i może być cofnięte.
8. Otwórz „Standard danych” i pobierz XLSX. Pokaż TERYT, dostęp, weryfikację, zakres źródła i przykłady błędów.
9. Pokaż ograniczenie: eksport CSV/JSON/GeoJSON jest paczką do dalszej publikacji przez uprawniony podmiot; aplikacja nie zapisuje do dane.gov.pl.

## Reset demonstracji

Zatrzymaj serwer, usuń `.data/aed-store.json` i uruchom ponownie. Aplikacja odtworzy cztery fikcyjne rekordy demonstracyjne.
