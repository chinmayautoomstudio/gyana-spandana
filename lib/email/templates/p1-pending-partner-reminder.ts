export const P1_PENDING_PARTNER_SUPPORT_EMAIL = 'gyanaspardha@gmail.com'

export interface P1PendingPartnerReminderData {
  p1Name: string
  teamName: string
  p2InvitedEmail: string
  invitationLink: string
  updateP2EmailLink: string
  expiresAt: string
  /** Defaults to gyanaspardha@gmail.com */
  supportEmail?: string
}

/**
 * Email to Participant 1 when their partner has not completed team registration.
 */
export function buildP1PendingPartnerReminderEmail(data: P1PendingPartnerReminderData) {
  const {
    p1Name,
    teamName,
    p2InvitedEmail,
    invitationLink,
    updateP2EmailLink,
    expiresAt,
    supportEmail = P1_PENDING_PARTNER_SUPPORT_EMAIL,
  } = data

  const subject = `Your teammate has not completed registration – ${teamName} (GYANA SPARDHA)`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">GYANA SPARDHA</h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Odisha Quiz Competition</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0 0 16px 0;">Team registration still pending</p>
    <p style="margin: 0 0 16px 0;">Hi ${p1Name},</p>
    <p style="margin: 0 0 16px 0;">
      Your team <strong>${teamName}</strong> is not fully registered yet. Your partner (<strong>${p2InvitedEmail}</strong>) has not completed their registration.
    </p>
    <p style="margin: 0 0 16px 0;">
      They may have missed our emails or unsubscribed from mail. Please remind them to check their inbox (including spam) or <strong>share the link below</strong> so they can complete registration.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #C0392B 0%, #E67E22 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Registration link for your partner
      </a>
    </div>

    <p style="font-size: 13px; color: #666;">
      This link is valid until <strong>${expiresAt}</strong>.
    </p>

    <div style="background: #fff8f0; padding: 18px; border-radius: 8px; margin: 24px 0; border: 1px solid #f0d9c2;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Wrong email for your partner?</p>
      <p style="margin: 0 0 14px 0; font-size: 14px; color: #555;">
        If you need to change Participant 2’s invited email, sign in and use the link below.
      </p>
      <div style="text-align: center;">
        <a href="${updateP2EmailLink}" style="display: inline-block; color: #C0392B; font-weight: bold; font-size: 15px;">
          Update Participant 2’s email
        </a>
      </div>
    </div>

    <p style="margin: 20px 0 8px 0; font-size: 14px; color: #555;">
      For any issues, contact us at
      <a href="mailto:${supportEmail}" style="color: #C0392B; font-weight: bold;">${supportEmail}</a>.
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

Team registration still pending

Hi ${p1Name},

Your team "${teamName}" is not fully registered yet. Your partner (${p2InvitedEmail}) has not completed their registration.

They may have missed our emails or unsubscribed from mail. Please remind them to check their inbox (including spam) or share this link so they can complete registration:

${invitationLink}

This link is valid until ${expiresAt}.

Wrong email for your partner? Update Participant 2's invited email here:
${updateP2EmailLink}

For any issues, contact us at: ${supportEmail}

---
GYANA SPARDHA – Odisha Quiz Competition. This is an automated message.
  `.trim()

  return { subject, html, text }
}
