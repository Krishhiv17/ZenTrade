// ============================================================
// Service-role Supabase client — SERVER-ONLY.
//
// Bypasses RLS. Used ONLY for trusted backend jobs that need to
// write the shared knowledge corpus (KB seeder / ingestion script).
//
// ⚠️  NEVER import this from a client component or any file that
//     ends up in the browser bundle — it carries the service-role
//     key, which must never reach the client.
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _admin: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (_admin) return _admin

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')

  _admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _admin
}
