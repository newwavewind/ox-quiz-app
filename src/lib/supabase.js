import { createClient } from '@supabase/supabase-js'

let client = null

export function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(url && key)
}

/** @returns {import('@supabase/supabase-js').SupabaseClient | null} */
export function getSupabase() {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
          flowType: 'pkce',
        },
      },
    )
  }
  return client
}
