"use client";

import { useState } from "react";

export function ExportButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(null);

  async function handleExport() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/reports/export-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setResult({ error: body.error ?? "Error exportando." });
      return;
    }
    setResult({ url: body.url });
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={handleExport} disabled={loading} className="btn-secondary !py-1.5">
        {loading ? "Exportando..." : `Exportar ${clientName} a Sheets`}
      </button>
      {result?.url && (
        <a href={result.url} target="_blank" rel="noreferrer" className="text-brand-600 text-sm hover:underline">
          Abrir hoja
        </a>
      )}
      {result?.error && <span className="text-xs text-red-600">{result.error}</span>}
    </div>
  );
}
