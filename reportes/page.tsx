import { createClient } from "@/lib/supabase/server";
import { ExportButton } from "@/components/operaciones/ExportButton";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const supabase = createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reportes</h1>
        <p className="text-sm text-gray-500">
          Genera una Google Sheet de solo lectura por cliente, con el resumen y el historial de
          operaciones. Postgres sigue siendo la fuente de verdad — esto solo publica una copia
          actualizada para compartir.
        </p>
      </div>

      <div className="card space-y-3">
        {(clients ?? []).length === 0 && (
          <p className="text-sm text-gray-400">No hay clientes para exportar todavía.</p>
        )}
        {(clients ?? []).map((c) => (
          <div key={c.id} className="flex items-center justify-between border-b last:border-0 border-gray-100 pb-3 last:pb-0">
            <span className="font-medium text-sm">{c.name}</span>
            <ExportButton clientId={c.id} clientName={c.name} />
          </div>
        ))}
      </div>

      <div className="card bg-amber-50 border-amber-200 text-sm text-amber-800">
        Requiere las variables de entorno <code className="bg-white/60 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> y{" "}
        <code className="bg-white/60 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code> configuradas (ver README).
      </div>
    </div>
  );
}
