import { NextRequest, NextResponse } from 'next/server'

interface EmailNotificationPayload {
  authorityEmail: string
  authorityName: string
  teamName: string
  teamCode: string
  participant1Name: string
  participant1School: string
  participant2Name: string
  participant2School: string
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailNotificationPayload = await request.json()
    const {
      authorityEmail,
      authorityName,
      teamName,
      teamCode,
      participant1Name,
      participant1School,
      participant2Name,
      participant2School,
    } = body

    // Validate required fields
    if (!authorityEmail || !authorityName || !teamName || !teamCode) {
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
    const registrationDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Create email content
    const emailSubject = 'GYANA SPARDHA: New Team Registration Notification'
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
    <p>Dear ${authorityName},</p>
    
    <p>We are pleased to inform you that a team from your educational institution has successfully registered for the <strong>GYANA SPARDHA - Odisha Quiz Competition</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C0392B;">
      <h2 style="color: #C0392B; margin-top: 0; font-size: 20px;">Team Registration Details</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Team Name:</td>
          <td style="padding: 8px 0;">${teamName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Team ID:</td>
          <td style="padding: 8px 0; font-family: monospace; color: #C0392B; font-weight: bold;">${teamCode}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Registration Date:</td>
          <td style="padding: 8px 0;">${registrationDate}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0; font-size: 18px;">Participant Information</h3>
      
      <div style="margin-bottom: 15px;">
        <strong>Participant 1:</strong><br>
        Name: ${participant1Name}<br>
        School/College: ${participant1School}
      </div>
      
      <div>
        <strong>Participant 2:</strong><br>
        Name: ${participant2Name}<br>
        School/College: ${participant2School}
      </div>
    </div>
    
    <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563EB;">
      <p style="margin: 0; font-size: 14px;">
        <strong>Note:</strong> This is an automated notification. The registration is subject to verification and approval by the competition organizers.
      </p>
    </div>
    
    <p>For any queries or concerns regarding this registration, please contact the competition organizers.</p>
    
    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>GYANA SPARDHA Team</strong>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.
    </p>
  </div>
</body>
</html>
    `

    const emailText = `
GYANA SPARDHA - Odisha Quiz Competition

Dear ${authorityName},

We are pleased to inform you that a team from your educational institution has successfully registered for the GYANA SPARDHA - Odisha Quiz Competition.

Team Registration Details:
- Team Name: ${teamName}
- Team ID: ${teamCode}
- Registration Date: ${registrationDate}

Participant Information:
- Participant 1: ${participant1Name} (${participant1School})
- Participant 2: ${participant2Name} (${participant2School})

Note: This is an automated notification. The registration is subject to verification and approval by the competition organizers.

For any queries or concerns regarding this registration, please contact the competition organizers.

Best regards,
GYANA SPARDHA Team
    `.trim()

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'GYANA SPARDHA <noreply@example.com>',
      to: [authorityEmail],
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
    console.error('Error sending authority notification email:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

