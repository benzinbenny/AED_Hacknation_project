# Macierz wymagań i realizacji

| Obszar | Realizacja w prototypie | Status / dalsze prace |
|---|---|---|
| Przegląd AED | Wyszukiwalna lista, filtry, szczegóły, mapa | Gotowe dla demonstracji; brak geolokalizacji i nawigacji |
| Wiarygodność | Pochodzenie, daty, unknown, rozdzielenie statusu i godzin | Gotowe w modelu i widoku; status nie jest live |
| Import | CSV i GeoJSON, ręczne przekazanie od wszystkich dysponentów, konektory OpenAEDMap/Krosno/Marki/Przemyśl/Warszawa | Gotowe dla profili jawnie wymienionych; rejestr nie jest wyczerpujący, import XLSX nieobsługiwany |
| Zakres źródeł | Geografia, data danych, deklarowana częstotliwość, licencja, pochodzenie i ograniczenia | Widoczne w `/zrodla` i arkuszu `Zrodla`; zakres nie dowodzi kompletności ani aktualności |
| Jakość | Walidacja zakresu, kolejność GeoJSON, ostrzeżenia zakresu PL, pola TERYT w standardzie | Brak geokodowania, walidacji kodów TERYT wobec rejestru i walidacji adresu |
| Duplikaty | Kandydaci do 30 m, niezależne źródła, ręczne scalanie/cofnięcie | Gotowe jako ostrożny prototyp; brak zaawansowanego dopasowania semantycznego |
| Licencje | Rejestr źródeł, ręczne zatwierdzenie, bramka eksportu | Gotowe w demo; decyzje prawne pozostają po stronie operatora |
| Moderacja | Kolejka rekordów i ślad decyzji | Prosty token demonstracyjny; przed wdrożeniem wymagane logowanie/role |
| Eksport | CSV, JSON, GeoJSON z pochodzeniem | Gotowe dla rekordów zatwierdzonych i nie-syntetycznych |
| Standard XLSX | Instrukcja, zakres kanoniczny, słowniki, profile źródeł, przykłady błędów | Wzorzec v0.2; nie wszystkie pola są dostarczane przez istniejące źródła |
| Publikacja portalowa | Przygotowanie plików dla uprawnionego podmiotu | Brak bezpośredniego API zapisu; należy użyć oficjalnego konta i procesu |
| Dostępność | Lista zamiast samej mapy, semantyczne kontrolki, fokus, responsywność | Nie deklarujemy WCAG; potrzebny audyt manualny z czytnikiem ekranu |
| Dane demo | Jawnie syntetyczne, widoczny komunikat, eksport domyślny wyklucza demo | Gotowe |
| Przechowywanie | JSON atomowy, interfejs repozytorium | Tylko jeden proces; docelowo PostgreSQL i migracje |
| Wdrożenie | Build Next.js | Brak konfiguracji hostingu, domeny, monitoringu i kopii zapasowych |
