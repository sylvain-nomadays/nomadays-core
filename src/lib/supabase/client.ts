import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Singleton instance to ensure consistent session across the app
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
