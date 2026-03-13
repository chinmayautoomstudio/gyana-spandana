import type { TeamInvitationTemplateData } from './team-invitation'

/**
 * Email template for reminding Participant 2 to complete their registration.
 * Uses the same data contract as the initial invitation template.
 */
export function buildTeamInvitationReminderEmail(data: TeamInvitationTemplateData) {
  const { p2Email, p1Name, teamName, schoolName, invitationLink, expiresAt } = data

  const subject = `Reminder: Complete your registration for ${teamName} on GYANA SPARDHA`

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
    <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0 0 16px 0;">Gentle reminder to join your team</p>
    <p style="margin: 0 0 16px 0;">
      Hi ${p2Email},
    </p>
    <p style="margin: 0 0 24px 0;">
      <strong>${p1Name}</strong> has already created the team <strong>${teamName}</strong> for the
      <strong>GYANA SPARDHA – Odisha Quiz Competition</strong>, and your spot is still waiting for you.
    </p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C0392B;">
      <h2 style="color: #C0392B; margin-top: 0; font-size: 18px;">Team details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; font-weight: bold; width: 40%;">Team name:</td><td style="padding: 6px 0;">${teamName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Participant 1:</td><td style="padding: 6px 0;">${p1Name}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">School / College:</td><td style="padding: 6px 0;">${schoolName}</td></tr>
      </table>
    </div>

    <p style="margin: 20px 0;">
      To confirm your place on this team and complete your registration, click the button below and fill in your details.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Complete registration
      </a>
    </div>

    <p style="font-size: 13px; color: #666;">
      This reminder link is valid until <strong>${expiresAt}</strong>. If you are no longer able to participate or did not expect this email, you can safely ignore it.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
      GYANA SPARDHA – Odisha Quiz Competition. This is an automated message.
    </p>
  </div>
</body>
</html>
  `.trim()

  const text = `
GYANA SPARDHA – Odisha Quiz Competition

Reminder to complete your registration

Hi ${p2Email},

${p1Name} has created the team ${teamName} for the GYANA SPARDHA – Odisha Quiz Competition, and your spot is still reserved.

Team details:
- Team name: ${teamName}
- Participant 1: ${p1Name}
- School / College: ${schoolName}

Complete your registration and join the team: ${invitationLink}

This reminder link is valid until ${expiresAt}. If you are no longer able to participate or did not expect this email, you can ignore this message.

---
GYANA SPARDHA – Odisha Quiz Competition. This is an automated message.
  `.trim()

  return { subject, html, text }
}

