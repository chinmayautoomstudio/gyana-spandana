/**
 * Shared template for the participant first-time registration (welcome) email.
 * Used by the send-registration-confirmation API and the preview route.
 */

export interface RegistrationConfirmationTemplateData {
  participantName: string
  participantEmail: string
  participantSchool: string
  teammateName: string
  teammateSchool: string
  teamName: string
  teamCode: string
  registrationDateFormatted: string
  loginUrl: string
}

export function buildRegistrationConfirmationEmail(data: RegistrationConfirmationTemplateData) {
  const {
    participantName,
    participantEmail,
    participantSchool,
    teammateName,
    teammateSchool,
    teamName,
    teamCode,
    registrationDateFormatted,
    loginUrl,
  } = data

  const subject = "Welcome to GYANA SPARDHA – You're registered!"

  const logoUrl =
    'https://xqxnyrrifzvkzkxmsguv.supabase.co/storage/v1/object/public/website-elements/AutoomStudiologo.png'
  const autoomStudioUrl = 'https://autoomstudio.com'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">GYANA SPARDHA</h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Odisha Quiz Competition</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <p style="font-size: 20px; font-weight: bold; color: #333; margin: 0 0 8px 0;">Welcome, ${participantName}. You're in.</p>
    <p style="margin: 0 0 24px 0;">Your team is successfully registered for <strong>GYANA SPARDHA – Odisha Quiz Competition</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C0392B;">
      <h2 style="color: #C0392B; margin-top: 0; font-size: 20px;">Your team</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Team name:</td>
          <td style="padding: 8px 0;">${teamName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Team ID:</td>
          <td style="padding: 8px 0; font-family: monospace; color: #C0392B; font-weight: bold; font-size: 16px;">${teamCode}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Registration date:</td>
          <td style="padding: 8px 0;">${registrationDateFormatted}</td>
        </tr>
      </table>
      <p style="margin: 12px 0 0 0; font-size: 13px; color: #555;">Join Online Screening test and be in the race for winning cash prize.</p>
    </div>
    
    <div style="background: white; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0;"><strong>You:</strong> ${participantName}, ${participantSchool}</p>
      <p style="margin: 0;"><strong>Teammate:</strong> ${teammateName}, ${teammateSchool}</p>
    </div>
    
    <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
      <h3 style="color: #2e7d32; margin-top: 0; font-size: 18px;">What's next</h3>
      <ol style="margin: 10px 0; padding-left: 20px; color: #333;">
        <li style="margin-bottom: 6px;">Log in with your email and password</li>
        <li style="margin-bottom: 6px;">Complete your profile</li>
        <li style="margin-bottom: 6px;">Watch for Screening Exam</li>
        <li style="margin-bottom: 6px;">Join Screening Exam when it's scheduled</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Log in to your account
      </a>
    </div>
    
    <p style="margin-top: 24px; font-size: 14px; color: #555;">Questions? Contact the organizers.</p>
    
    <p style="text-align: center; margin: 24px 0 0 0; font-size: 14px; color: #555;">Follow us
      <a href="https://www.facebook.com/people/Gyana-Spardha/61588103514633/" style="margin: 0 8px;"><img src="https://img.icons8.com/color/48/1877F2/facebook.png" alt="Facebook" width="28" height="28" style="display: inline-block; width: 28px; height: 28px; vertical-align: middle; border: 0;" /></a>
      <a href="https://www.instagram.com/gyanaspardha/" style="margin: 0 8px;"><img src="https://img.icons8.com/color/48/E4405F/instagram-new.png" alt="Instagram" width="28" height="28" style="display: inline-block; width: 28px; height: 28px; vertical-align: middle; border: 0;" /></a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
      This is an automated message. If you didn't register, please ignore.
    </p>
    <p style="font-size: 12px; color: #666; text-align: center; margin: 12px 0 0 0;">
      Powered by <a href="${autoomStudioUrl}"><img src="${logoUrl}" alt="AutoomStudio" style="display: inline-block; max-width: 100px; height: auto; vertical-align: middle; border: 0;" /></a>
    </p>
  </div>
</body>
</html>
  `.trim()

  const text = `
GYANA SPARDHA – Odisha Quiz Competition

Welcome, ${participantName}. You're in.

Your team is successfully registered for GYANA SPARDHA – Odisha Quiz Competition.

Your team
- Team name: ${teamName}
- Team ID: ${teamCode}
- Registration date: ${registrationDateFormatted}

Join Online Screening test and be in the race for winning cash prize.

You: ${participantName}, ${participantSchool}
Teammate: ${teammateName}, ${teammateSchool}

What's next
1. Log in with your email and password
2. Complete your profile
3. Watch for Screening Exam
4. Join Screening Exam when it's scheduled

Log in to your account: ${loginUrl}

Questions? Contact the organizers.

Follow us: Facebook: https://www.facebook.com/people/Gyana-Spardha/61588103514633/, Instagram: https://www.instagram.com/gyanaspardha/

---
This is an automated message. If you didn't register, please ignore.

Powered by AutoomStudio.
  `.trim()

  return { subject, html, text }
}
