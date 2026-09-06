import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canWrite } from "@/lib/auth/roles";
import { exportClientSheet, createClientSpreadsheet } from "@/lib/sheets/export";

/**
 * Exporta el historial + resumen de un cliente a una Google Sheet de salida.
 * Postgres sigue siendo la fuente de verdad — este endpoint solo publica una copia.
 * Body: { client_id: string, spreadsheet_id?: string }
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canWrite(profile?.role)) {
    return NextResponse.json({ error: "No tenés permisos para exportar reportes." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.client_id) {
    return NextResponse.json({ error: "Falta client_id." }, { status: 400 });
  }

  const [{ data: client }, { data: summary }, { data: operations }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", body.client_id).single(),
    supabase.from("v_client_summary").select("*").eq("client_id", body.client_id).single(),
    supabase
      .from("operations")
      .select("*, assets(ticker)")
      .eq("client_id", body.client_id)
      .order("date", { ascending: false }),
  ]);

  if (!client) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

  try {
    const spreadsheetId = body.spreadsheet_id ?? (await createClientSpreadsheet(client.name));

    const url = await exportClientSheet({
      spreadsheetId,
      clientName: client.name,
      operations: ((operations ?? []) as any[]).map((o) => ({ ...o, asset_ticker: o.assets?.ticker })),
      summary: summary as any,
    });

    return NextResponse.json({ url, spreadsheetId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Error exportando a Sheets." }, { status: 500 });
  }
}
