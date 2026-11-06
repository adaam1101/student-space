// ============================================================================
// ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
// Server-Only Supabase Service Role Client (NEVER import in Client Components)
// ============================================================================

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./client";

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !isSupabaseConfigured() ||
    !serviceRoleKey ||
    serviceRoleKey.includes("your-supabase")
  ) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
