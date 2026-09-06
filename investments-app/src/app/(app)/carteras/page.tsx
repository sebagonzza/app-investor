import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Position, ClientSummary } from "@/types";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default async function CarterasPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: positions }] = await Promise.all([
    supabase.from("v_client_summary").select("*"),
    supabase.from("v_positions").select("*"),
  ]);

  const summaries = (clients ?? []) as ClientSummary[];
  const allPositions = (positions ?? []) as Position[];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Carteras</h1>
      <p className="text-sm text-gray-500 -mt-4">
        Composición de cartera por cliente — cantidades y valor a precio promedio.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {summaries.map((c) => {
          const positionsForClient = allPositions.filter((p) => p.client_id === c.client_id);
          const totalValue = positionsForClient.reduce((acc, p) => acc + p.quantity * p.avg_price, 0);
          return (
            <div key={c.client_id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold">{c.name}</h2>
                  <p className="text-xs text-gray-400">{c.type}</p>
                </div>
                <Link href={`/clientes/${c.client_id}`} className="text-brand-600 text-sm hover:underline">
                  Ver cliente
                </Link>
              </div>

              {positionsForClient.length === 0 ? (
                <p className="text-sm text-gray-400">Sin posiciones abiertas.</p>
              ) : (
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Activo</th>
                      <th>Cantidad</th>
                      <th>P. promedio</th>
                      <th>% cartera</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionsForClient.map((p) => {
                      const value = p.quantity * p.avg_price;
                      const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
                      return (
                        <tr key={p.asset_id}>
                          <td>{p.ticker}</td>
                          <td>{p.quantity}</td>
                          <td>{money(p.avg_price)}</td>
                          <td>{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
        {summaries.length === 0 && (
          <p className="text-sm text-gray-400">Sin clientes cargados todavía.</p>
        )}
      </div>
    </div>
  );
}
