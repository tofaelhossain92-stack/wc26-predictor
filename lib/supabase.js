import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-key')

export const supabaseAdmin = createClient(url || 'https://placeholder.supabase.co', serviceKey || anonKey || 'placeholder-key')
