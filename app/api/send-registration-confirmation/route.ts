import { NextRequest, NextResponse } from 'next/server'

interface RegistrationConfirmationPayload {
  participantEmail: string
  participantName: string
  participantSchool: string
  teammateName: string
  teammateSchool: string
  teamName: string
  teamCode: string
  registrationDate: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RegistrationConfirmationPayload = await request.json()
    const {
      participantEmail,
      participantName,
      participantSchool,
      teammateName,
      teammateSchool,
      teamName,
      teamCode,
      registrationDate,
    } = body

    // Validate required fields
    if (!participantEmail || !participantName || !teamName || !teamCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured. Email notification skipped.')
      return NextResponse.json(
        { message: 'Email service not configured', skipped: true },
        { status: 200 }
      )
    }

    // Dynamic import of Resend to handle case where it's not installed
    let Resend
    try {
      Resend = (await import('resend')).Resend
    } catch (error) {
      console.warn('Resend package not installed. Email notification skipped.')
      return NextResponse.json(
        { message: 'Email service not available', skipped: true },
        { status: 200 }
      )
    }

    const resend = new Resend(resendApiKey)

    // Format registration date
    const registrationDateFormatted = new Date(registrationDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Get site URL for login link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const loginUrl = `${siteUrl}/login`

    // Create email content
    const emailSubject = 'GYANA SPARDHA: Registration Confirmation'
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">GYANA SPARDHA</h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Odisha Quiz Competition</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <p>Dear ${participantName},</p>
    
    <p>Congratulations! Your team has been <strong>successfully registered</strong> for the <strong>GYANA SPARDHA - Odisha Quiz Competition</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C0392B;">
      <h2 style="color: #C0392B; margin-top: 0; font-size: 20px;">Your Team Details</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Team Name:</td>
          <td style="padding: 8px 0;">${teamName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Team ID:</td>
          <td style="padding: 8px 0; font-family: monospace; color: #C0392B; font-weight: bold; font-size: 16px;">${teamCode}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Registration Date:</td>
          <td style="padding: 8px 0;">${registrationDateFormatted}</td>
        </tr>
      </table>
      
      <div style="background: #fff3cd; padding: 12px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #ffc107;">
        <p style="margin: 0; font-size: 13px; color: #856404;">
          <strong>Important:</strong> Please save your Team ID (${teamCode}) for future reference. You'll need it to access your account and participate in exams.
        </p>
      </div>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0; font-size: 18px;">Your Information</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Name:</td>
          <td style="padding: 8px 0;">${participantName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Email:</td>
          <td style="padding: 8px 0;">${participantEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">School/College:</td>
          <td style="padding: 8px 0;">${participantSchool}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0; font-size: 18px;">Your Teammate</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Name:</td>
          <td style="padding: 8px 0;">${teammateName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">School/College:</td>
          <td style="padding: 8px 0;">${teammateSchool}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
      <h3 style="color: #2e7d32; margin-top: 0; font-size: 18px;">Next Steps</h3>
      <ol style="margin: 10px 0; padding-left: 20px; color: #333;">
        <li style="margin-bottom: 8px;">Log in to your account using your email and password</li>
        <li style="margin-bottom: 8px;">Complete your profile (add profile photo, address, etc.)</li>
        <li style="margin-bottom: 8px;">Wait for exam announcements and notifications</li>
        <li style="margin-bottom: 8px;">Participate in scheduled exams when they become available</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Log In to Your Account
      </a>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
      <p style="margin: 0; font-size: 14px; color: #1565c0;">
        <strong>Need Help?</strong> If you have any questions or need assistance, please contact the competition organizers. We're here to help you succeed!
      </p>
    </div>
    
    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>GYANA SPARDHA Team</strong>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.<br>
      If you did not register for this competition, please ignore this email.
    </p>
  </div>
</body>
</html>
    `

    const emailText = `
GYANA SPARDHA - Odisha Quiz Competition

Dear ${participantName},

Congratulations! Your team has been successfully registered for the GYANA SPARDHA - Odisha Quiz Competition.

Your Team Details:
- Team Name: ${teamName}
- Team ID: ${teamCode}
- Registration Date: ${registrationDateFormatted}

Important: Please save your Team ID (${teamCode}) for future reference. You'll need it to access your account and participate in exams.

Your Information:
- Name: ${participantName}
- Email: ${participantEmail}
- School/College: ${participantSchool}

Your Teammate:
- Name: ${teammateName}
- School/College: ${teammateSchool}

Next Steps:
1. Log in to your account using your email and password
2. Complete your profile (add profile photo, address, etc.)
3. Wait for exam announcements and notifications
4. Participate in scheduled exams when they become available

Log in to your account: ${loginUrl}

Need Help? If you have any questions or need assistance, please contact the competition organizers. We're here to help you succeed!

Best regards,
GYANA SPARDHA Team

---
This is an automated email. Please do not reply to this message.
If you did not register for this competition, please ignore this email.
    `.trim()

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'GYANA SPARDHA <noreply@example.com>',
      to: [participantEmail],
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    })

    if (error) {
      console.error('Resend API error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Email sent successfully', emailId: data?.id },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error sending registration confirmation email:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
