# Bezpieczeństwo, prywatność i dostępność

## W prototypie

- Plik importu ma limit 5 MiB, formaty są ograniczone do CSV i JSON/GeoJSON, a współrzędne i rekordy przechodzą walidację.
- Importowane rekordy czekają na moderację. Nieznana licencja blokuje zatwierdzenie i publiczny eksport.
- Odpowiedzi eksportu nie zawierają danych zgłaszających; formularz zabrania dodawania danych osobowych.
- CSV chroni tekst przed interpretacją jako formuła arkusza.
- Magazyn lokalny nie przechowuje haseł ani sekretów w rekordach. `.data` jest wykluczone z repozytorium.
- Zewnętrzne pobieranie działa wyłącznie z profili allowlisty. Serwer weryfikuje HTTPS i host przekierowania, limit czasu i rozmiaru; niedokończony lub niepoprawny transfer nie jest stage'owany.
- Token Warszawy odczytuje wyłącznie backend z `AED_WARSAW_API_TOKEN`; przeglądarka go nie otrzymuje. Bez tokenu konektor odmawia pobrania.
- Adaptery ograniczają pola mapowane z GeoJSON do schematu AED i pomijają dane kontaktowe, takie jak telefon i e-mail.
- Lista w moderacji pokazuje do 30 rekordów na stronę, a podgląd par duplikatów jest ograniczony do 40 pozycji.
- W trybie produkcyjnym moderator nie ma domyślnego tokenu. `AED_MODERATOR_TOKEN` musi pochodzić z menedżera sekretów.
- Nawigacja i widoki mają etykiety, stan przycisków, widoczny fokus, semantyczne nagłówki i obsługiwalną listę jako alternatywę dla mapy.
- Użytkownik widzi komunikat, że dane przykładowe są syntetyczne i nie służą do decyzji ratunkowych.

## Przed wdrożeniem

Wymagane są: prawdziwe logowanie i role, CSRF/ochrona sesji odpowiednia do wybranego mechanizmu, limity żądań i skanowanie plików, kontrola typów MIME i limitów także na reverse proxy, transakcyjna baza z audytem, szyfrowanie kopii zapasowych, polityka retencji, monitoring, aktualizacje bezpieczeństwa, przegląd prawny licencji oraz testy dostępności z klawiaturą i czytnikiem ekranu. Token nagłówkowy w demonstracji nie jest produkcyjnym systemem tożsamości. Konektory wymagają monitoringu zmian formatu, cyklicznego sprawdzania metadanych źródła oraz bezpiecznego zarządzania sekretem Warszawy.

## Ograniczenia oceny

Automatyczne testy nie stanowią deklaracji zgodności WCAG. Mapa i kafelki są usługą zewnętrzną; zawsze zapewniamy listę punktów i opis pochodzenia. Nie jest to usługa krytyczna ani źródło statusów w czasie rzeczywistym.
