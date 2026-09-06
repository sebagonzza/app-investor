import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ClientSummary } from "@/types";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default async function ClientesPage() {
  const supabase = createClient();
  const { data: summaries } = await supabase.from("v_client_summary").select("*");
  const clients = (summaries ?? []) as ClientSummary[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Link href="/clientes/nuevo" className="btn-primary">
          + Nuevo cliente
        </Link>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Capital aportado</th>
              <th>Retiros</th>
              <th>Capital actual</th>
              <th>Resultado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">
                  Todavía no hay clientes cargados.
                </td>
              </tr>
            )}
            {clients.map((c) => {
              const capitalActual = c.capital_aportado - c.retiros;
              const resultado = c.resultado_trading + c.ingresos_pasivos - c.comisiones_pagadas;
              return (
                <tr key={c.client_id} className="hover:bg-gray-50">
                  <td className="font-medium">{c.name}</td>
                  <td>
                    <span
                      className={
                        c.type === "PROPIO"
                          ? "bg-brand-50 text-brand-700 text-xs px-2 py-0.5 rounded-full"
                          : "bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
                      }
                    >
                      {c.type}
                    </span>
                  </td>
                  <td>{money(c.capital_aportado)}</td>
                  <td>{money(c.retiros)}</td>
                  <td>{money(capitalActual)}</td>
                  <td className={resultado >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {money(resultado)}
                  </td>
                  <td>
                    <Link href={`/clientes/${c.client_id}`} className="text-brand-600 text-sm hover:underline">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
