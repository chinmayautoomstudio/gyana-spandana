import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        const missingVars = []
        if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
        if (!serviceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
        
        throw new Error(
            `Missing Supabase environment variables: ${missingVars.join(', ')}. ` +
            `Please check your .env.local file in the project root. ` +
            `See ENV_SETUP.md for setup instructions.`
        )
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
