import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default async function MovimientosPage() {
  const supabase = createClient();
  const { data: movimientos } = await supabase
    .from("operations")
    .select("*, clients(name)")
    .in("type", ["DEPOSITO", "RETIRO", "DIVIDENDO", "INTERES", "COMISION"])
    .order("date", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Movimientos</h1>
      <p className="text-sm text-gray-500 -mt-2">
        Depósitos, retiros, dividendos, intereses y comisiones — el resto de los tipos de operación
        se ven en la sección Operaciones.
      </p>

      <div className="card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Total</th>
              <th>Moneda</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {(movimientos ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8">
                  Sin movimientos registrados.
                </td>
              </tr>
            )}
            {((movimientos ?? []) as any[]).map((m) => (
              <tr key={m.id}>
                <td>{m.date}</td>
                <td>{m.clients?.name}</td>
                <td>{m.type}</td>
                <td>{money(m.total)}</td>
                <td>{m.currency}</td>
                <td className="max-w-xs truncate">{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
