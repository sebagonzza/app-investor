import { createClient } from "@/lib/supabase/server";
import { ResultByGroupChart } from "@/components/dashboard/PortfolioCharts";
import type { ClientSummary } from "@/types";

export const dynamic = "force-dynamic";

export default async function RendimientosPage() {
  const supabase = createClient();
  const { data: summaries } = await supabase.from("v_client_summary").select("*");
  const clients = (summaries ?? []) as ClientSummary[];

  const rows = clients.map((c) => {
    const capitalActual = c.capital_aportado - c.retiros;
    const resultado = c.resultado_trading + c.ingresos_pasivos - c.comisiones_pagadas;
    const rendimiento = capitalActual > 0 ? (resultado / capitalActual) * 100 : 0;
    return { ...c, capitalActual, resultado, rendimiento };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Rendimientos</h1>

      <div className="card">
        <h2 className="text-sm font-semibold mb-2">Rendimiento % por cliente</h2>
        <ResultByGroupChart data={rows.map((r) => ({ name: r.name, result: r.rendimiento }))} />
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Capital actual</th>
              <th>Resultado</th>
              <th>Rendimiento %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-400 py-8">
                  Sin datos todavía.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.client_id}>
                <td className="font-medium">{r.name}</td>
                <td>
                  {r.capitalActual.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                </td>
                <td className={r.resultado >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {r.resultado.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                </td>
                <td className={r.rendimiento >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {r.rendimiento.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
