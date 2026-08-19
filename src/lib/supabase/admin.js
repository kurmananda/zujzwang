import { createClient } from "@supabase/supabase-js";

// Service-role client — server-only (used for signup, which must create the
// auth user directly). Never import this from a Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
