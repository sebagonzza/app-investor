import { createClient } from "@/lib/supabase/server";
import { NuevaOperacionForm } from "@/components/operaciones/NuevaOperacionForm";
import { RowActions } from "@/components/operaciones/RowActions";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default async function OperacionesPage({
  searchParams,
}: {
  searchParams: { q?: string; tipo?: string };
}) {
  const supabase = createClient();

  const [{ data: clients }, { data: assets }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("assets").select("id, ticker").order("ticker"),
  ]);

  let query = supabase
    .from("operations")
    .select("*, clients(name), assets(ticker)")
    .order("date", { ascending: false })
    .limit(200);

  if (searchParams.tipo) query = query.eq("type", searchParams.tipo);

  const { data: operations } = await query;

  const filtered = ((operations ?? []) as any[]).filter((o) => {
    if (!searchParams.q) return true;
    const q = searchParams.q.toLowerCase();
    return (
      o.clients?.name?.toLowerCase().includes(q) ||
      o.assets?.ticker?.toLowerCase().includes(q) ||
      o.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Nueva operación</h1>
      <NuevaOperacionForm clients={clients ?? []} assets={assets ?? []} />

      <div className="flex items-center justify-between pt-4">
        <h2 className="text-lg font-semibold">Historial de operaciones</h2>
        <form className="flex gap-2 text-sm">
          <input
            type="text"
            name="q"
            placeholder="Buscar cliente, activo o nota..."
            defaultValue={searchParams.q}
            className="input-field !py-1.5 w-64"
          />
          <select name="tipo" defaultValue={searchParams.tipo} className="input-field !py-1.5">
            <option value="">Todos los tipos</option>
            <option value="COMPRA">Compra</option>
            <option value="VENTA">Venta</option>
            <option value="DEPOSITO">Depósito</option>
            <option value="RETIRO">Retiro</option>
            <option value="DIVIDENDO">Dividendo</option>
            <option value="INTERES">Interés</option>
            <option value="COMISION">Comisión</option>
            <option value="OTRO">Otro</option>
          </select>
          <button className="btn-secondary !py-1.5">Filtrar</button>
        </form>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Activo</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Comisión</th>
              <th>Total</th>
              <th>Moneda</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-gray-400 py-8">
                  Sin operaciones registradas.
                </td>
              </tr>
            )}
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td>{o.date}</td>
                <td>{o.clients?.name}</td>
                <td>{o.assets?.ticker ?? "-"}</td>
                <td>{o.type}</td>
                <td>{o.quantity}</td>
                <td>{money(o.price)}</td>
                <td>{money(o.commission)}</td>
                <td>{money(o.total)}</td>
                <td>{o.currency}</td>
                <td className="text-right">
                  <RowActions id={o.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
