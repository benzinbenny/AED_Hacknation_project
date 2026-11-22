# Bezpieczeństwo, prywatność i dostępność

## W prototypie

- Plik importu ma limit 5 MiB, formaty są ograniczone do CSV, JSON/GeoJSON i kanonicznego XLSX, a współrzędne i rekordy przechodzą walidację.
- XLSX jest odczytywany wyłącznie z zakładki `Dane_AED`; formuły nie są wykonywane ani używane jako wartości danych.
- Przed odczytem XLSX aplikacja sprawdza strukturę archiwum ZIP, liczbę wpisów i deklarowany rozmiar po rozpakowaniu, aby ograniczyć ryzyko archiwum-bomby.
- Importowane rekordy czekają na moderację. Nieznana licencja blokuje zatwierdzenie i publiczny eksport.
- Zmiana URL, pochodzenia, licencji, atrybucji lub zakresu znanego źródła resetuje jego wcześniejszą akceptację licencji do ponownej kontroli; źródło ręcznie zablokowane pozostaje zablokowane.
- Odpowiedzi eksportu nie zawierają danych zgłaszających; formularz zabrania dodawania danych osobowych.
- CSV chroni tekst przed interpretacją jako formuła arkusza.
- Magazyn lokalny nie przechowuje haseł ani sekretów w rekordach. `.data` jest wykluczone z repozytorium.
- Zewnętrzne pobieranie działa wyłącznie z profili allowlisty. Serwer weryfikuje HTTPS i host przekierowania, limit czasu i rozmiaru; niedokończony lub niepoprawny transfer nie jest stage'owany.
- Token Warszawy odczytuje wyłącznie backend z `AED_WARSAW_API_TOKEN`; przeglądarka go nie otrzymuje. Bez tokenu konektor odmawia pobrania.
- Adaptery ograniczają pola mapowane z GeoJSON do schematu AED i pomijają dane kontaktowe, takie jak telefon i e-mail.
- Lista w moderacji pokazuje do 30 rekordów na stronę, a podgląd par duplikatów jest ograniczony do 40 pozycji.
- W trybie produkcyjnym moderator nie ma domyślnego tokenu. `AED_MODERATOR_TOKEN` musi pochodzić z menedżera sekretów.
- Nawigacja i widoki mają link „Przejdź do treści”, etykiety, stan przycisków, widoczny fokus, semantyczne nagłówki i obsługiwalną listę jako alternatywę dla mapy. Mapa oraz przewijane tabele mają nazwane regiony i opis sposobu skorzystania z alternatywy.
- Ruch dekoracyjny kampanii uruchamia się wyłącznie dla użytkowników bez ustawionego `prefers-reduced-motion`; globalna reguła ogranicza animacje, gdy użytkownik tego oczekuje.
- Użytkownik widzi komunikat, że dane przykładowe są syntetyczne i nie służą do decyzji ratunkowych.

## Przed wdrożeniem

Wymagane są: prawdziwe logowanie i role, CSRF/ochrona sesji odpowiednia do wybranego mechanizmu, limity żądań i skanowanie plików, kontrola typów MIME i limitów także na reverse proxy, transakcyjna baza z audytem, szyfrowanie kopii zapasowych, polityka retencji, monitoring, aktualizacje bezpieczeństwa, przegląd prawny licencji oraz testy dostępności z klawiaturą i czytnikiem ekranu. Token nagłówkowy w demonstracji nie jest produkcyjnym systemem tożsamości. Konektory wymagają monitoringu zmian formatu, cyklicznego sprawdzania metadanych źródła oraz bezpiecznego zarządzania sekretem Warszawy.

## Dowody automatyczne

Testy Playwright sprawdzają działanie linku pomijania treści, brak naruszeń Axe o poziomie `serious` lub `critical` na stronach `/kampania`, `/zrodla`, `/standard` i `/dodaj`, oraz brak poziomego przewijania przy szerokości 375 px i 768 px. Wyniki i data wykonania są zapisywane w `docs/verification.md`.

## Ograniczenia oceny

Automatyczne testy nie stanowią deklaracji zgodności WCAG 2.2 AA. Przed taką deklaracją wymagany jest manualny audyt klawiaturą, przy powiększeniu, z czytnikiem ekranu oraz z użytkownikami. Mapa i kafelki są usługą zewnętrzną; zawsze zapewniamy listę punktów i opis pochodzenia. Nie jest to usługa krytyczna ani źródło statusów w czasie rzeczywistym.
