import { createClient } from "@/lib/supabase/server";
import { canManageUsers } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
  const isAdmin = canManageUsers(myProfile?.role);

  const { data: profiles } = isAdmin
    ? await supabase.from("profiles").select("id, full_name, role")
    : { data: null };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configuración</h1>

      <div className="card">
        <h2 className="text-sm font-semibold mb-2">Mi cuenta</h2>
        <p className="text-sm text-gray-600">Email: {user?.email}</p>
        <p className="text-sm text-gray-600">Rol: {myProfile?.role ?? "VIEWER"}</p>
      </div>

      {isAdmin ? (
        <div className="card !p-0 overflow-x-auto">
          <h2 className="text-sm font-semibold px-5 pt-4 pb-2">Usuarios y roles</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p: any) => (
                <tr key={p.id}>
                  <td>{p.full_name ?? "(sin nombre)"}</td>
                  <td>{p.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-5 pb-4 pt-2">
            Los roles se editan directamente en Supabase por ahora (tabla `profiles`). Un panel de
            edición en la UI queda fuera del MVP.
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Solo un ADMIN puede ver la gestión de usuarios.</p>
      )}
    </div>
  );
}
