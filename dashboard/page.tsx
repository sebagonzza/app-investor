import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  CapitalEvolutionChart,
  PortfolioDistributionChart,
  ResultByGroupChart,
} from "@/components/dashboard/PortfolioCharts";
import type { ClientSummary, Position } from "@/types";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string };
}) {
  const supabase = createClient();

  const [{ data: summaries }, { data: positions }, { data: operations }] = await Promise.all([
    supabase.from("v_client_summary").select("*"),
    supabase.from("v_positions").select("*"),
    supabase
      .from("operations")
      .select("date, type, total")
      .order("date", { ascending: true }),
  ]);

  const clientSummaries = (summaries ?? []) as ClientSummary[];
  const clientPositions = (positions ?? []) as Position[];

  const capitalPropio = clientSummaries
    .filter((c) => c.type === "PROPIO")
    .reduce((acc, c) => acc + c.capital_aportado - c.retiros, 0);
  const capitalTerceros = clientSummaries
    .filter((c) => c.type === "TERCERO")
    .reduce((acc, c) => acc + c.capital_aportado - c.retiros, 0);
  const capitalTotal = capitalPropio + capitalTerceros;
  const gananciaTotal = clientSummaries.reduce(
    (acc, c) => acc + c.resultado_trading + c.ingresos_pasivos - c.comisiones_pagadas,
    0
  );
  const rendimiento = capitalTotal > 0 ? (gananciaTotal / capitalTotal) * 100 : 0;

  // Evolución de capital: acumulado simple de depósitos/retiros/resultados por fecha
  let running = 0;
  const evolution = (operations ?? []).map((o) => {
    const delta =
      o.type === "DEPOSITO" ? o.total : o.type === "RETIRO" ? -o.total : o.type === "VENTA" ? o.total : 0;
    running += delta;
    return { date: o.date, capital: running };
  });

  const distribution = Object.values(
    clientPositions.reduce((acc: Record<string, { name: string; value: number }>, p) => {
      const key = p.ticker;
      const value = p.quantity * p.avg_price;
      if (!acc[key]) acc[key] = { name: key, value: 0 };
      acc[key].value += value;
      return acc;
    }, {})
  );

  const resultByClient = clientSummaries.map((c) => ({
    name: c.name,
    result: c.resultado_trading + c.ingresos_pasivos - c.comisiones_pagadas,
  }));

  const hasData = clientSummaries.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <form className="flex items-center gap-2 text-sm">
          <input type="date" name="desde" defaultValue={searchParams.desde} className="input-field !py-1.5" />
          <span className="text-gray-400">a</span>
          <input type="date" name="hasta" defaultValue={searchParams.hasta} className="input-field !py-1.5" />
          <button className="btn-secondary !py-1.5">Filtrar</button>
        </form>
      </div>

      {!hasData && (
        <div className="card text-sm text-gray-500">
          Todavía no hay datos cargados. Corré la migración inicial (
          <code className="bg-gray-100 px-1 rounded">npm run migrate:xlsx</code>) o cargá una operación desde
          "Operaciones → Nueva operación".
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Capital total" value={money(capitalTotal)} />
        <KpiCard label="Capital propio" value={money(capitalPropio)} />
        <KpiCard label="Capital de terceros" value={money(capitalTerceros)} />
        <KpiCard
          label="Ganancia / Pérdida"
          value={money(gananciaTotal)}
          positive={gananciaTotal >= 0}
        />
        <KpiCard
          label="Rendimiento %"
          value={`${rendimiento.toFixed(2)}%`}
          positive={rendimiento >= 0}
        />
        <KpiCard label="Clientes" value={String(clientSummaries.length)} />
        <KpiCard label="Inversiones" value={String(new Set(clientPositions.map((p) => p.ticker)).size)} />
        <KpiCard label="Operaciones" value={String((operations ?? []).length)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold mb-2">Evolución del capital</h2>
          <CapitalEvolutionChart data={evolution} />
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold mb-2">Distribución de cartera</h2>
          <PortfolioDistributionChart data={distribution} />
        </div>
        <div className="card md:col-span-2">
          <h2 className="text-sm font-semibold mb-2">Resultado por cliente</h2>
          <ResultByGroupChart data={resultByClient} />
        </div>
      </div>
    </div>
  );
}
