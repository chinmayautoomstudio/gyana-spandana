import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    throw new Error(
      `Missing Supabase environment variables: ${missingVars.join(', ')}. ` +
      `Please check your .env.local file in the project root. ` +
      `See ENV_SETUP.md for setup instructions.`
    )
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}

