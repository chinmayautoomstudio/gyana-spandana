/**
 * Email template for inviting Participant 2 to join a team (two-step registration).
 */

export interface TeamInvitationTemplateData {
  p2Email: string
  p1Name: string
  teamName: string
  schoolName: string
  invitationLink: string
  expiresAt: string
  /** Link for Participant 1 to correct Participant 2's invited email (e.g. reminder emails). */
  updateP2EmailLink?: string
}

export function buildTeamInvitationEmail(data: TeamInvitationTemplateData) {
  const { p2Email, p1Name, teamName, schoolName, invitationLink, expiresAt } = data

  const subject = `You're invited to join ${teamName} on GYANA SPARDHA`

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
    <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0 0 16px 0;">You're invited to join a team</p>
    <p style="margin: 0 0 24px 0;"><strong>${p1Name}</strong> has invited you to join their team <strong>${teamName}</strong> for the GYANA SPARDHA – Odisha Quiz Competition.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C0392B;">
      <h2 style="color: #C0392B; margin-top: 0; font-size: 18px;">Team details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; font-weight: bold; width: 40%;">Team name:</td><td style="padding: 6px 0;">${teamName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Participant 1:</td><td style="padding: 6px 0;">${p1Name}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">School / College:</td><td style="padding: 6px 0;">${schoolName}</td></tr>
      </table>
    </div>

    <p style="margin: 20px 0;">Click the button below to complete your registration and join the team. You will need to fill in your details and create a password.</p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Accept invitation and register
      </a>
    </div>

    <p style="font-size: 13px; color: #666;">This invitation link expires on <strong>${expiresAt}</strong>. If you did not expect this email, you can ignore it.</p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">GYANA SPARDHA – Odisha Quiz Competition. This is an automated message.</p>
  </div>
</body>
</html>
  `.trim()

  const text = `
GYANA SPARDHA – Odisha Quiz Competition

You're invited to join a team

${p1Name} has invited you to join their team ${teamName} for the GYANA SPARDHA – Odisha Quiz Competition.

Team details:
- Team name: ${teamName}
- Participant 1: ${p1Name}
- School / College: ${schoolName}

Accept the invitation and complete your registration: ${invitationLink}

This invitation link expires on ${expiresAt}. If you did not expect this email, you can ignore it.

---
GYANA SPARDHA – Odisha Quiz Competition. This is an automated message.
  `.trim()

  return { subject, html, text }
}
