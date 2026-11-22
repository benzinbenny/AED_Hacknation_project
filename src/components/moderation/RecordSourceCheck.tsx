import { useState } from "react";
import type { AedRecord } from "../../domain/types";
import type { RecordCheckResult } from "../../services/check-record";
import { getAedSourceProfile } from "../../sources/catalog";

type Report = { name: string; text: string; results?: RecordCheckResult };

export function RecordSourceCheck({ record, token, removed }: { record: AedRecord; token: string; removed: string[] }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [busy, setBusy] = useState(false);
  const ids = [...new Set(record.sources.map((s) => s.sourceId))];
  async function check() {
    setBusy(true); setReports([]);
    for (const id of ids) {
      const profile = getAedSourceProfile(id);
      const name = profile?.name ?? record.sources.find((s) => s.sourceId === id)?.attribution ?? id;
      let report: Report;
      if (removed.includes(id)) report = { name, text: "Zainstaluj ponownie źródło, aby wznowić sprawdzanie." };
      else {
        try {
          const response = await fetch(`/api/moderation/${record.id}/check?source=${encodeURIComponent(id)}`, { method: "POST", headers: { "x-moderator-token": token } });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          report = { name, text: data.note ?? `Sprawdzono ${new Date(data.checkedAt).toLocaleString("pl-PL")}`, results: data.results };
        } catch (error) { report = { name, text: error instanceof Error ? error.message : "Błąd pobierania danych." }; }
      }
      setReports((previous) => [...(previous ?? []), report]);
    }
    setBusy(false);
  }
  return <div className="record-check">
    <button className="button button-outline" disabled={busy} onClick={() => void check()}>{busy ? "Sprawdzanie…" : ids.some((id) => getAedSourceProfile(id)) ? "Odśwież u źródła" : "Sprawdź dane wpisu"}</button>
    <div aria-live="polite">{reports?.map((report, index) => <div className="check-result" key={index}>
      <strong>{report.name}</strong><p>{report.text}</p>
      {report.results?.map((item) => <div key={item.id}><p>{item.id} · {item.status}</p>
        {item.differences.map((d) => <p key={d.field}><b>{d.field}</b><br />Katalog: {d.catalog ?? "brak"}<br />Źródło: {d.source ?? "brak"}</p>)}
      </div>)}
    </div>)}</div>
  </div>;
}
