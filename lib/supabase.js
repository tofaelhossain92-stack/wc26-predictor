import { createClient } from '@supabase/supabase-js'

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL      || 'https://xtairnvavocsliewquhd.supabase.co'
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY     || ''

// Use whichever key is available — anon for client, service for admin
const clientKey = anonKey || serviceKey || 'placeholder'
const adminKey  = serviceKey || anonKey || 'placeholder'

export const supabase      = createClient(url, clientKey)
export const supabaseAdmin = createClient(url, adminKey)
