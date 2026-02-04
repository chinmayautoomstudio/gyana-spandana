import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const examId = resolvedParams.id

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { participantIds, customMessage } = body

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'participantIds must be a non-empty array' }, { status: 400 })
    }

    // Fetch exam details
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // Fetch participants with their email addresses
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, name, email, school_name, teams(team_name, team_code)')
      .in('id', participantIds)

    if (participantsError) {
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: 'No participants found' }, { status: 404 })
    }

    // Verify participants are assigned to this exam
    const { data: assignments } = await supabase
      .from('exam_participants')
      .select('participant_id')
      .eq('exam_id', examId)
      .in('participant_id', participantIds)

    const assignedParticipantIds = new Set((assignments || []).map(a => a.participant_id))
    const unassignedParticipants = participants.filter(p => !assignedParticipantIds.has(p.id))

    if (unassignedParticipants.length > 0) {
      return NextResponse.json({
        error: `Some participants are not assigned to this exam: ${unassignedParticipants.map(p => p.name).join(', ')}`,
      }, { status: 400 })
    }

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({
        error: 'Email service not configured. Please set RESEND_API_KEY environment variable.',
      }, { status: 500 })
    }

    // Dynamic import of Resend
    let Resend
    try {
      Resend = (await import('resend')).Resend
    } catch (error) {
      return NextResponse.json({
        error: 'Email service not available. Please install resend package.',
      }, { status: 500 })
    }

    const resend = new Resend(resendApiKey)

    // Get site URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const examUrl = `${siteUrl}/exams/${examId}/take`

    // Format dates
    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'Not scheduled'
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    // Send emails to each participant
    const results = await Promise.allSettled(
      participants.map(async (participant) => {
        const emailSubject = `GYANA SPARDHA: Exam Invitation - ${exam.title}`
        
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">GYANA SPARDHA</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Odisha Quiz Competition</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <h2 style="color: #333; margin-top: 0;">Exam Invitation</h2>
      
      <p>Dear ${participant.name},</p>
      
      <p>You have been invited to take the following exam individually. Each participant in your team will take this exam separately, and your team's final score will be calculated by summing both participants' individual scores.</p>

      <!-- Exam Details -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C0392B;">
        <h3 style="color: #C0392B; margin-top: 0;">${exam.title}</h3>
        ${exam.description ? `<p style="color: #666; margin: 10px 0;">${exam.description}</p>` : ''}
        <table style="width: 100%; margin-top: 15px;">
          <tr>
            <td style="padding: 5px 0; color: #666; width: 40%;">Duration:</td>
            <td style="padding: 5px 0; color: #333; font-weight: bold;">${exam.duration_minutes} minutes</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Total Questions:</td>
            <td style="padding: 5px 0; color: #333; font-weight: bold;">${exam.total_questions} questions</td>
          </tr>
          ${exam.scheduled_start ? `
          <tr>
            <td style="padding: 5px 0; color: #666;">Start Time:</td>
            <td style="padding: 5px 0; color: #333; font-weight: bold;">${formatDate(exam.scheduled_start)}</td>
          </tr>
          ` : ''}
          ${exam.scheduled_end ? `
          <tr>
            <td style="padding: 5px 0; color: #666;">End Time:</td>
            <td style="padding: 5px 0; color: #333; font-weight: bold;">${formatDate(exam.scheduled_end)}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${customMessage ? `
      <!-- Custom Message -->
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
        <p style="margin: 0; color: #1565c0; font-style: italic;">${customMessage}</p>
      </div>
      ` : ''}

      <!-- Exam Link Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${examUrl}" style="display: inline-block; background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          Take Exam
        </a>
      </div>

      <!-- Individual Participation Notice -->
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
        <h4 style="color: #1565c0; margin-top: 0;">Individual Exam Participation:</h4>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1565c0;">
          <li>You must take this exam individually using your own account</li>
          <li>Each participant in your team will receive their own exam link</li>
          <li>Your team's final score will be the sum of both participants' individual scores</li>
          <li>You cannot share your exam link or answers with your teammate</li>
        </ul>
      </div>

      <!-- Instructions -->
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h4 style="color: #856404; margin-top: 0;">Important Instructions:</h4>
        <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
          <li>You must be logged in to access the exam</li>
          <li>Ensure you have a stable internet connection</li>
          <li>The exam will be conducted in fullscreen mode with security monitoring</li>
          <li>You will have ${exam.duration_minutes} minutes to complete the exam</li>
          <li>Answers are auto-saved every 2 seconds</li>
          ${exam.scheduled_start ? `<li>The exam is scheduled to start at ${formatDate(exam.scheduled_start)}</li>` : ''}
        </ul>
      </div>

      <!-- Exam Link (Text) -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          <strong>Exam Link:</strong><br>
          <a href="${examUrl}" style="color: #C0392B; word-break: break-all;">${examUrl}</a>
        </p>
      </div>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>GYANA SPARDHA Team</strong>
      </p>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
        This is an automated email. Please do not reply to this message.<br>
        If you have any questions, please contact the competition organizers.
      </p>
    </div>
  </div>
</body>
</html>
        `.trim()

        const emailText = `
GYANA SPARDHA - Odisha Quiz Competition

Dear ${participant.name},

You have been invited to take the following exam individually. Each participant in your team will take this exam separately, and your team's final score will be calculated by summing both participants' individual scores.

Exam: ${exam.title}
Duration: ${exam.duration_minutes} minutes
Total Questions: ${exam.total_questions} questions
${exam.scheduled_start ? `Start Time: ${formatDate(exam.scheduled_start)}` : ''}
${exam.scheduled_end ? `End Time: ${formatDate(exam.scheduled_end)}` : ''}

${customMessage ? `\nMessage:\n${customMessage}\n` : ''}

Take the exam: ${examUrl}

Individual Exam Participation:
- You must take this exam individually using your own account
- Each participant in your team will receive their own exam link
- Your team's final score will be the sum of both participants' individual scores
- You cannot share your exam link or answers with your teammate

Important Instructions:
- You must be logged in to access the exam
- Ensure you have a stable internet connection
- The exam will be conducted in fullscreen mode with security monitoring
- You will have ${exam.duration_minutes} minutes to complete the exam
- Answers are auto-saved every 2 seconds
${exam.scheduled_start ? `- The exam is scheduled to start at ${formatDate(exam.scheduled_start)}` : ''}

Best regards,
GYANA SPARDHA Team

---
This is an automated email. Please do not reply to this message.
        `.trim()

        const { error: emailError } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'GYANA SPARDHA <noreply@example.com>',
          to: [participant.email],
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
        })

        if (emailError) {
          throw new Error(`Failed to send to ${participant.email}: ${emailError.message}`)
        }

        return { participantId: participant.id, email: participant.email, success: true }
      })
    )

    // Count successes and failures
    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message || 'Unknown error')

    return NextResponse.json({
      success: failed === 0,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Error sending exam invitations:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
