import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { operationBaseSchema, computeTotal } from "@/lib/validations/operation";
import { canWrite, canDelete } from "@/lib/auth/roles";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canWrite(profile?.role)) {
    return NextResponse.json({ error: "No tenés permisos para editar operaciones." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = operationBaseSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const update: Record<string, unknown> = { ...input };
  if (input.type && input.quantity !== undefined && input.price !== undefined) {
    update.total = computeTotal(input as any);
  }

  const { data, error } = await supabase
    .from("operations")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canDelete(profile?.role)) {
    return NextResponse.json({ error: "Solo un ADMIN puede eliminar operaciones." }, { status: 403 });
  }

  const { error } = await supabase.from("operations").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
