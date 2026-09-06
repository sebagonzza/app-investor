import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canWrite } from "@/lib/auth/roles";
import { z } from "zod";

const assetSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().optional(),
  type: z.string().optional(),
  sector: z.string().optional(),
  currency: z.string().default("ARS"),
});

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from("assets").select("*").order("ticker");
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
    return NextResponse.json({ error: "No tenés permisos para crear activos." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = assetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase.from("assets").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
