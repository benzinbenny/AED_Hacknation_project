import { useState } from "react";

export function SourceInstallationAction({ id, name, installed, busy, canManage, requestAdmin, change }: {
  id: string; name: string; installed: boolean; busy: boolean; canManage: boolean;
  requestAdmin: () => void; change: (id: string, installed: boolean) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  if (installed && confirming && canManage) return <div role="group" aria-label="Potwierdź odinstalowanie">
    <p>Odinstalować źródło „{name}”? Wstrzymasz kolejne importy. Dotychczasowe wpisy i historia pozostaną w katalogu.</p>
    <div className="inventory-actions"><button className="button button-outline" type="button" disabled={busy} onClick={() => setConfirming(false)}>Anuluj</button>
      <button className="button button-danger" type="button" disabled={busy} onClick={async () => { await change(id, false); setConfirming(false); }}>Potwierdź odinstalowanie</button></div>
  </div>;
  return <button className="button button-outline" type="button" disabled={busy} onClick={() => {
    if (!canManage) requestAdmin();
    else if (installed) setConfirming(true);
    else void change(id, true);
  }}>{installed ? "Odinstaluj" : "Zainstaluj"}</button>;
}
