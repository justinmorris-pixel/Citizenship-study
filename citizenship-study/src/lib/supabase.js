import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasConfig = Boolean(url && key)
export const supabase = hasConfig ? createClient(url, key) : null

// Calls a database function and returns its JSON result.
export async function rpc(fn, args) {
  if (!supabase) throw new Error('NO_CONFIG')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data
}
