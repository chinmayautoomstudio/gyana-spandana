import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // If code exchange fails, redirect to login
      const url = new URL(`${origin}/login`)
      url.searchParams.set('error', 'auth_failed')
      return NextResponse.redirect(url)
    }

    // After successful code exchange, check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      // User not authenticated, redirect to login
      const url = new URL(`${origin}/login`)
      url.searchParams.set('error', 'not_authenticated')
      return NextResponse.redirect(url)
    }

    // Check if user has a participant record (completed registration)
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      // User is authenticated but doesn't have a participant record
      // This means registration is incomplete, redirect to register page
      const url = new URL(`${origin}/register`)
      url.searchParams.set('message', 'Please complete your registration')
      return NextResponse.redirect(url)
    }

    // User is authenticated and has participant record, redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}

