# Wzorcowy zakres danych AED — wersja 0.2

Standard jest wspólnym kontraktem wymiany dla gmin, służb, placówek ochrony zdrowia, zarządców budynków, organizacji społecznych i innych dysponentów. Pola są zaprojektowane tak, by można było przenieść je do pliku CSV/GeoJSON, rejestru operacyjnego lub portalu dane.gov.pl. Obowiązkowe minimum pozwala zlokalizować punkt i zachować pochodzenie; reszta powinna być podawana, jeśli dysponent ją zna.

## Zasady

1. Brak informacji zapisuj jako `unknown`; nie imputuj stanu urządzenia ani dostępu.
2. Godziny pracy miejsca, dostępność wynikająca z harmonogramu i sprawność AED to trzy różne rzeczy.
3. Zachowaj oryginalną wartość czasu dostępu. Interpretacja harmonogramu powinna mieć wersję i moment oceny.
4. WGS84: `latitude` to szerokość od −90 do 90, `longitude` to długość od −180 do 180. GeoJSON używa kolejności długość, szerokość.
5. Zachowaj identyfikator pierwotnego rekordu i metadane pozyskania.
6. Licencja i atrybucja są częścią danych. `unknown` blokuje standardowy eksport publiczny.
7. Podobieństwo przestrzenne jest tylko wskazówką. Każde scalenie i cofnięcie decyzji zapisuje historię.
8. Zasięg geograficzny i czasowy, deklarowana częstotliwość oraz ograniczenia są metadanymi źródła, nie obietnicą kompletności.
9. TERYT zapisuj jako tekst, zachowując zera wiodące; GeoJSON współrzędne zapisuje jako `[longitude, latitude]`.
10. Weryfikacja wskazuje osobno zakres (położenie, dostęp, stan lub pełna kontrola), metodę, wykonawcę i czas.

## Pola kanoniczne

| Pole | Znaczenie | Reguła |
|---|---|---|
| `id` | Stabilne UUID rekordu w aplikacji | Wyliczane deterministycznie z identyfikatora źródłowego |
| `name` | Nazwa lokalizacji lub urządzenia | Może pozostać pusta |
| `operatorName` | Dysponent lub operator | Brak danych to `null` |
| `location.latitude`, `location.longitude` | Położenie WGS84 | Zakres walidowany; bez cichej zamiany |
| `address`, `locationDescription` | Adres i opis dojścia | Wartości pochodzą ze źródła lub moderatora |
| `accessType` | `public`, `customers`, `restricted`, `private`, `unknown` | Nie jest stanem technicznym AED |
| `availability.rawHours` | Surowy zapis harmonogramu | Zachowujemy tekst źródłowy |
| `availability.state` | `open_by_schedule`, `closed_by_schedule`, `unknown` | Nie oznacza sprawności AED |
| `operationalStatus` | `reported_operational`, `reported_out_of_service`, `unknown` | Zawsze zgłoszony status z datą/źródłem |
| `lastVerifiedAt` | Czas weryfikacji | Nie jest zastępowany czasem importu |
| `recordStatus` | `active`, `temporarily_removed`, `removed`, `unknown` | Status wpisu w katalogu, nie status urządzenia |
| `sources[]` | Źródło, ID źródłowe, URL, pochodzenie, czas, licencja, atrybucja, skrót surowej treści | Co najmniej jedna referencja |

## Zalecany zestaw wymienianych pól

| Grupa | Pola | Minimum / reguła |
|---|---|---|
| Identyfikacja | `aed_id`, `external_reference`, `nazwa`, `operator` | Stabilny identyfikator rekordu w zbiorze i identyfikator dysponenta, jeśli istnieje |
| Położenie | `latitude`, `longitude`, `coordinate_accuracy_m` | WGS84; współrzędne obowiązkowe, dokładność opcjonalna, bez automatycznej zamiany osi |
| Administracja | `country_code`, `voivodeship`, `county`, `municipality`, `locality`, `postal_code`, `teryt_terc`, `teryt_simc` | Podaj dostępne poziomy; TERYT jako tekst |
| Miejsce i dojście | `adres`, `opis_lokalizacji`, `indoor`, `floor`, `entrance_description` | Pomaga odróżnić punkt na mapie od rzeczywistego dostępu do urządzenia |
| Dostęp | `access_type`, `access_notes`, `opening_hours_raw`, `timezone`, `availability_state`, `availability_evaluated_at` | Zachowaj oryginalne godziny; ocenę dostępności datuj i wiąż ze strefą IANA |
| Stan i weryfikacja | `operational_status`, `operational_status_observed_at`, `last_verified_at`, `verification_method`, `verification_actor_type`, `verification_scope`, `next_verification_due_at` | Nie wyprowadzaj sprawności z harmonogramu, importu ani samego istnienia rekordu |
| Status wpisu | `record_status` | Odróżnij aktywny wpis od wycofanego lub usuniętego urządzenia |
| Pochodzenie i licencja | `source_id`, `source_record_id`, `source_url`, `upstream_origin`, `source_data_date`, `source_updated_at`, `fetched_at`, `license_id`, `attribution` | Pochodzenie per źródło; nie łącz w jeden wspólny identyfikator licencji |
| Zakres źródła | `reference_geography`, `reference_geography_level`, `reference_temporal_description`, `reference_data_date`, `reference_update_frequency`, `reference_basis`, `reference_limitations` | Poziom może być krajowy, wojewódzki, powiatowy, gminny, miejscowość lub inny/mieszany; opis wskazuje, czy zakres jest deklarowany czy zaobserwowany |

### Zakres minimalny do publikacji

`aed_id`, `latitude`, `longitude`, `access_type` (może być `unknown`), `operational_status` (może być `unknown`), `record_status`, `source_id`, `source_record_id`, `source_url`, `fetched_at`, `license_id` i `attribution` (jeśli licencja ich wymaga). Brak TERYT lub adresu nie powinien blokować zgłoszenia, ale powinien być wykazany jako brak jakościowy.

Nie należy publikować bez podstawy prawnej informacji kontaktowych osób, prywatnych numerów telefonów, adresów e-mail ani danych zgłaszających. Dane operacyjne osób kontaktowych mogą pozostać w systemie dysponenta.

Szablon XLSX: `/api/standard`. Zawiera zakładki Instrukcja, Dane_AED, Slownik_pol, Slowniki_wartosci, Zrodla i Przyklady_bledow. Zakładka Zrodla zawiera pięć zarejestrowanych profili demonstracyjnych; przed użyciem należy sprawdzić najnowsze metadane u dysponenta. Wzorzec nie oznacza, że aplikacja aktualnie waliduje wszystkie kody TERYT względem rejestru referencyjnego.
