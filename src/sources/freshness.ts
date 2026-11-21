import type { SourceReferenceScope } from "../domain/types";

export type SourceFreshnessStatus = "fresh" | "attention" | "stale" | "reference" | "not_collected";

export type SourceFreshness = {
  status: SourceFreshnessStatus;
  label: string;
  description: string;
  collectedAt: string | null;
  ageInDays: number | null;
};

type FrequencyWindow = { freshWithinDays: number; attentionWithinDays: number };

function frequencyWindow(updateFrequency: string): FrequencyWindow {
  const normalized = updateFrequency.toLocaleLowerCase("pl-PL");
  if (/(codzien|daily)/.test(normalized)) return { freshWithinDays: 2, attentionWithinDays: 7 };
  if (/(tygodni|weekly)/.test(normalized)) return { freshWithinDays: 9, attentionWithinDays: 21 };
  if (/(miesięcz|monthly)/.test(normalized)) return { freshWithinDays: 45, attentionWithinDays: 90 };
  return { freshWithinDays: 30, attentionWithinDays: 90 };
}

function isReferenceFrequency(updateFrequency: string): boolean {
  const normalized = updateFrequency.toLocaleLowerCase("pl-PL");
  return /(jednoraz|nie dotyczy|brak deklarowanego harmonogramu)/.test(normalized);
}

function daysSince(value: string, now: Date): number | null {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
}

function agePhrase(days: number): string {
  if (days === 0) return "dzisiaj";
  if (days === 1) return "1 dzień temu";
  return `${days} dni temu`;
}

export function assessSourceFreshness(
  scope: SourceReferenceScope,
  lastFetchedAt: string | null | undefined,
  now = new Date(),
): SourceFreshness {
  if (isReferenceFrequency(scope.updateFrequency)) {
    return {
      status: "reference",
      label: "Źródło referencyjne",
      description: "Dysponent nie deklaruje cyklicznego odświeżania. Data publikacji opisuje źródło, ale nie potwierdza aktualności AED.",
      collectedAt: lastFetchedAt ?? null,
      ageInDays: lastFetchedAt ? daysSince(lastFetchedAt, now) : null,
    };
  }

  if (!lastFetchedAt) {
    return {
      status: "not_collected",
      label: "Nie pobrano do aplikacji",
      description: "Konektor lub plik źródłowy nie został jeszcze pobrany do kolejki moderacji.",
      collectedAt: null,
      ageInDays: null,
    };
  }

  const ageInDays = daysSince(lastFetchedAt, now);
  if (ageInDays === null) {
    return {
      status: "attention",
      label: "Wymaga sprawdzenia daty",
      description: "Nie udało się odczytać daty ostatniego pobrania; sprawdź historię źródła.",
      collectedAt: lastFetchedAt,
      ageInDays: null,
    };
  }

  const window = frequencyWindow(scope.updateFrequency);
  if (ageInDays <= window.freshWithinDays) {
    return {
      status: "fresh",
      label: "Pobrano zgodnie z rytmem",
      description: `Ostatnie pobranie: ${agePhrase(ageInDays)}. Status opisuje pobranie źródła, nie sprawność AED.`,
      collectedAt: lastFetchedAt,
      ageInDays,
    };
  }
  if (ageInDays <= window.attentionWithinDays) {
    return {
      status: "attention",
      label: "Zbliża się termin odświeżenia",
      description: `Ostatnie pobranie: ${agePhrase(ageInDays)}. Warto ponownie sprawdzić źródło względem deklarowanej częstotliwości.`,
      collectedAt: lastFetchedAt,
      ageInDays,
    };
  }
  return {
    status: "stale",
    label: "Wymaga odświeżenia",
    description: `Ostatnie pobranie: ${agePhrase(ageInDays)}. Źródło przekroczyło przyjęty bufor deklarowanej częstotliwości.`,
    collectedAt: lastFetchedAt,
    ageInDays,
  };
}
