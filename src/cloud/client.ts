import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
// Only the publishable key belongs in this build. Never a service-role key.
export const cloudClient = url && key ? createClient(url, key) : null
