"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente para uso en componentes de cliente ("use client").
// Solo usa la ANON key (segura de exponer al browser). Nunca la service role key acá.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
