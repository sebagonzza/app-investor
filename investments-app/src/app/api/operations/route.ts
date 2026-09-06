import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { operationSchema, computeTotal } from "@/lib/validations/operation";
import { canWrite } from "@/lib/auth/roles";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canWrite(profile?.role)) {
    return NextResponse.json({ error: "No tenés permisos para registrar operaciones." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = operationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const total = computeTotal(input);

  // Insert: RLS + el trigger `check_sell_quantity` en Postgres son la segunda barrera
  // contra vender más cantidad de la disponible (la primera es UX en el frontend).
  const { data, error } = await supabase
    .from("operations")
    .insert({
      client_id: input.client_id,
      asset_id: input.asset_id ?? null,
      date: input.date,
      type: input.type,
      quantity: input.quantity,
      price: input.price,
      currency: input.currency,
      commission: input.commission,
      total,
      notes: input.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    // El trigger de Postgres devuelve un mensaje claro cuando se intenta vender de más.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("operations")
    .select("*, clients(name), assets(ticker)")
    .order("date", { ascending: false });

  const clientId = searchParams.get("client_id");
  const type = searchParams.get("type");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (clientId) query = query.eq("client_id", clientId);
  if (type) query = query.eq("type", type);
  if (desde) query = query.gte("date", desde);
  if (hasta) query = query.lte("date", hasta);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
