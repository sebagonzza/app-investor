"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function Topbar({ userEmail, role }: { userEmail: string; role: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-end px-6 gap-4 sticky top-0 z-10">
      <div className="text-right">
        <p className="text-sm font-medium text-gray-800">{userEmail}</p>
        <p className="text-xs text-gray-400">{role}</p>
      </div>
      <button
        onClick={handleSignOut}
        className="btn-secondary !px-3 !py-2"
        title="Cerrar sesión"
      >
        <LogOut size={16} />
      </button>
    </header>
  );
}
