import { createClient } from '@supabase/supabase-js'

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL      || 'https://xtairnvavocsliewquhd.supabase.co'
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY     || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YWlybnZhdm9jc2xpZXdxdWhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk0NTM5NCwiZXhwIjoyMDk2NTIxMzk0fQ.EC_GU4lhbi6XHjB4S5bpmMc4r5Oi5Jw5lTqdl9btXOA'

// supabase = client-side (anon key, respects RLS)
// supabaseAdmin = server-side (service role key, bypasses RLS)
export const supabase      = createClient(url, anonKey || serviceKey)
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
