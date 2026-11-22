# Macierz wymagań i realizacji

| Obszar | Realizacja w prototypie | Status / dalsze prace |
|---|---|---|
| Przegląd AED | Wyszukiwalna lista, filtry, szczegóły, mapa; rekordy ze źródeł pojawiają się po kontroli licencji i ręcznej moderacji | Gotowe dla demonstracji; brak geolokalizacji i nawigacji |
| Wiarygodność | Pochodzenie, daty, unknown, rozdzielenie statusu i godzin | Gotowe w modelu i widoku; status nie jest live |
| Import | CSV, GeoJSON i kanoniczny XLSX (`Dane_AED`), ręczne przekazanie od wszystkich dysponentów, konektory OpenAEDMap/Krosno/Marki/Przemyśl/Warszawa oraz zbiorcze odświeżenie źródeł publicznych | Gotowe dla profili jawnie wymienionych; rejestr nie jest wyczerpujący, a import nadal wymaga kontroli licencji i moderacji |
| Zakres źródeł | Geografia, data danych, deklarowana częstotliwość, licencja, pochodzenie, ograniczenia i status świeżości pobrania | Widoczne w `/zrodla` i arkuszu `Zrodla`; zakres ani świeżość pobrania nie dowodzą kompletności, aktualności ani sprawności AED |
| Jakość | Walidacja zakresu, kolejność GeoJSON, ostrzeżenia zakresu PL, pola TERYT w standardzie | Brak geokodowania, walidacji kodów TERYT wobec rejestru i walidacji adresu |
| Duplikaty | Kandydaci do 30 m, niezależne źródła, ręczne scalanie/cofnięcie | Gotowe jako ostrożny prototyp; brak zaawansowanego dopasowania semantycznego |
| Licencje | Rejestr źródeł, ręczne zatwierdzenie, bramka eksportu | Gotowe w demo; decyzje prawne pozostają po stronie operatora |
| Moderacja | Kolejka rekordów i ślad decyzji | Prosty token demonstracyjny; przed wdrożeniem wymagane logowanie/role |
| Eksport | CSV, JSON, GeoJSON z pochodzeniem i metadane JSON-LD/DCAT | Gotowe dla rekordów zatwierdzonych i nie-syntetycznych; opublikowanie w dane.gov.pl wykonuje podmiot uprawniony |
| Standard XLSX | Instrukcja, zakres kanoniczny, słowniki, profile źródeł, przykłady błędów i import tej samej zakładki `Dane_AED` | Wzorzec v0.2; nie wszystkie pola są dostarczane przez istniejące źródła |
| Publikacja portalowa | Przygotowanie plików dla uprawnionego podmiotu | Brak bezpośredniego API zapisu; należy użyć oficjalnego konta i procesu |
| Kampania | Hasło „Masz dane o AED? Udostępnij je raz.”, logotyp, trzy kroki przekazania, animacja z poszanowaniem ograniczenia ruchu | Gotowe dla demonstracji; wdrożenie wymaga uzgodnienia komunikacji z właścicielem kampanii |
| Dostępność | Link pomijania treści, lista zamiast samej mapy, semantyczne kontrolki, fokus, opisane regiony tabel, responsywność i automatyczne testy Axe | Nie deklarujemy WCAG; potrzebny audyt manualny z czytnikiem ekranu, klawiaturą i powiększeniem |
| Dane demo | Jawnie syntetyczne, widoczny komunikat, eksport domyślny wyklucza demo | Gotowe |
| Przechowywanie | JSON atomowy, interfejs repozytorium | Tylko jeden proces; docelowo PostgreSQL i migracje |
| Wdrożenie | Build Next.js | Brak konfiguracji hostingu, domeny, monitoringu i kopii zapasowych |
