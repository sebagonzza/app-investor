import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/validations/client";
import { canWrite } from "@/lib/auth/roles";

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canWrite(profile?.role)) {
    return NextResponse.json({ error: "No tenés permisos para crear clientes." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = clientSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase.from("clients").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
