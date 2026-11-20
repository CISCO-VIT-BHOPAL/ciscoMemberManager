import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('cisco_supabase_url') : null
const localKey = typeof window !== 'undefined' ? localStorage.getItem('cisco_supabase_key') : null

const activeUrl = envUrl || localUrl
const activeKey = envKey || localKey

export const configMissing = !activeUrl || !activeKey || activeUrl.trim() === '' || activeKey.trim() === ''

// Fallback safe client so imports and hooks never throw when credentials are empty
export const supabase = createClient(
  !configMissing ? activeUrl.trim() : 'https://placeholder-project.supabase.co',
  !configMissing ? activeKey.trim() : 'placeholder-anon-key'
)

export function saveLocalCredentials(url, key) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cisco_supabase_url', url.trim())
    localStorage.setItem('cisco_supabase_key', key.trim())
    window.location.reload()
  }
}

export function clearLocalCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cisco_supabase_url')
    localStorage.removeItem('cisco_supabase_key')
    window.location.reload()
  }
}
