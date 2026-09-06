import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CapitalEvolutionChart } from "@/components/dashboard/PortfolioCharts";
import type { ClientSummary, Position, Operation } from "@/types";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: client }, { data: summary }, { data: positions }, { data: operations }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", params.id).single(),
      supabase.from("v_client_summary").select("*").eq("client_id", params.id).single(),
      supabase.from("v_positions").select("*").eq("client_id", params.id),
      supabase
        .from("operations")
        .select("*, assets(ticker)")
        .eq("client_id", params.id)
        .order("date", { ascending: false }),
    ]);

  if (!client) return notFound();

  const s = (summary ?? {}) as Partial<ClientSummary>;
  const capitalActual = (s.capital_aportado ?? 0) - (s.retiros ?? 0);
  const resultado = (s.resultado_trading ?? 0) + (s.ingresos_pasivos ?? 0) - (s.comisiones_pagadas ?? 0);
  const rendimiento = capitalActual > 0 ? (resultado / capitalActual) * 100 : 0;

  let running = 0;
  const evolution = ((operations ?? []) as any[])
    .slice()
    .reverse()
    .map((o) => {
      const delta = o.type === "DEPOSITO" ? o.total : o.type === "RETIRO" ? -o.total : o.type === "VENTA" ? o.total : 0;
      running += delta;
      return { date: o.date, capital: running };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{client.name}</h1>
        <p className="text-sm text-gray-500">{client.type === "PROPIO" ? "Capital propio" : "Cliente"}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Capital aportado" value={money(s.capital_aportado ?? 0)} />
        <KpiCard label="Retiros" value={money(s.retiros ?? 0)} />
        <KpiCard label="Capital actual" value={money(capitalActual)} />
        <KpiCard label="Ganancia/Pérdida" value={money(resultado)} positive={resultado >= 0} />
        <KpiCard label="Rendimiento %" value={`${rendimiento.toFixed(2)}%`} positive={rendimiento >= 0} />
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold mb-2">Evolución del rendimiento</h2>
        <CapitalEvolutionChart data={evolution} />
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold mb-3">Cartera</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Activo</th>
              <th>Cantidad</th>
              <th>Precio promedio</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {((positions ?? []) as Position[]).map((p) => (
              <tr key={p.asset_id}>
                <td>{p.ticker}</td>
                <td>{p.quantity}</td>
                <td>{money(p.avg_price)}</td>
                <td>{money(p.quantity * p.avg_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <h2 className="text-sm font-semibold px-5 pt-4 pb-2">Operaciones</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Activo</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {((operations ?? []) as any[]).map((o) => (
              <tr key={o.id}>
                <td>{o.date}</td>
                <td>{o.type}</td>
                <td>{o.assets?.ticker ?? "-"}</td>
                <td>{o.quantity}</td>
                <td>{money(o.price)}</td>
                <td>{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
