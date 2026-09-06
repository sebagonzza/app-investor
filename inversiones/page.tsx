import { createClient } from "@/lib/supabase/server";
import type { Position } from "@/types";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default async function InversionesPage() {
  const supabase = createClient();
  const { data: positions } = await supabase.from("v_positions").select("*, assets(name, type, sector)");
  const { data: resultByAsset } = await supabase.from("v_result_by_asset").select("*");

  const rows = ((positions ?? []) as any[]).reduce((acc: Record<string, any>, p) => {
    if (!acc[p.ticker]) {
      acc[p.ticker] = {
        ticker: p.ticker,
        name: p.assets?.name ?? p.asset_name,
        type: p.assets?.type ?? "-",
        sector: p.assets?.sector ?? "-",
        currency: p.currency,
        quantity: 0,
        totalCost: 0,
      };
    }
    acc[p.ticker].quantity += p.quantity;
    acc[p.ticker].totalCost += p.quantity * p.avg_price;
    return acc;
  }, {});

  const resultMap = new Map(((resultByAsset ?? []) as any[]).map((r) => [r.ticker, r.resultado]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Inversiones</h1>
      <p className="text-sm text-gray-500 -mt-2">
        Los precios actuales se completan manualmente por ahora; la arquitectura ya está lista para
        conectar una API de mercado (tabla <code className="bg-gray-100 px-1 rounded">price_snapshots</code>).
      </p>

      <div className="card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Sector</th>
              <th>Moneda</th>
              <th>Cantidad</th>
              <th>Precio promedio</th>
              <th>Valor (a costo)</th>
              <th>Resultado realizado</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(rows).length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-gray-400 py-8">
                  Sin posiciones cargadas todavía.
                </td>
              </tr>
            )}
            {Object.values(rows).map((r: any) => {
              const avg = r.quantity > 0 ? r.totalCost / r.quantity : 0;
              const result = resultMap.get(r.ticker) ?? 0;
              return (
                <tr key={r.ticker}>
                  <td className="font-medium">{r.ticker}</td>
                  <td>{r.name}</td>
                  <td>{r.type}</td>
                  <td>{r.sector}</td>
                  <td>{r.currency}</td>
                  <td>{r.quantity}</td>
                  <td>{money(avg)}</td>
                  <td>{money(r.totalCost)}</td>
                  <td className={result >= 0 ? "text-emerald-600" : "text-red-600"}>{money(result)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
