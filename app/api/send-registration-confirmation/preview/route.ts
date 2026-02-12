import { NextResponse } from 'next/server'
import { buildRegistrationConfirmationEmail } from '@/lib/email/templates/registration-confirmation'

/**
 * GET /api/send-registration-confirmation/preview
 * Returns the registration welcome email HTML with sample data for review.
 * No email is sent.
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const loginUrl = `${siteUrl}/login`

  const sampleData = {
    participantName: 'Priya Sharma',
    participantEmail: 'priya.sharma@example.com',
    participantSchool: "St. Xavier's School",
    teammateName: 'Aarav Singh',
    teammateSchool: "St. Xavier's School",
    teamName: 'Team Odisha Stars',
    teamCode: 'GS-2025-X7K9',
    registrationDateFormatted: '12 February 2025, 10:30 am',
    loginUrl,
  }

  const { html } = buildRegistrationConfirmationEmail(sampleData)

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
