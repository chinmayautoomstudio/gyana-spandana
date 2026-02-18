import { NextRequest, NextResponse } from 'next/server'
import { getInvitationByToken } from '@/app/actions/team'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
  }

  const invitation = await getInvitationByToken(token)
  if (!invitation.valid) {
    return NextResponse.json({ ok: false, error: invitation.error }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('invite_token', token, {
    path: '/',
    maxAge: 600,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
