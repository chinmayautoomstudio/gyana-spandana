export interface TeamNameChangedP2Data {
  p2Name: string
  p1Name: string
  previousTeamName: string
  newTeamName: string
}

/** Participant 2 is notified when Participant 1 renames the team (complete teams). */
export function buildTeamNameChangedP2Email(data: TeamNameChangedP2Data) {
  const { p2Name, p1Name, previousTeamName, newTeamName } = data
  const subject = `Team name updated: ${newTeamName} (GYANA SPARDHA)`

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
    <p style="margin: 0 0 16px 0;">Hi ${p2Name},</p>
    <p style="margin: 0 0 16px 0;">
      <strong>${p1Name}</strong> (Participant 1) has updated your team name for the GYANA SPARDHA – Odisha Quiz Competition.
    </p>
    <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C0392B;">
      <p style="margin: 0; font-size: 15px;"><strong>Previous name:</strong> ${previousTeamName}</p>
      <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>New name:</strong> ${newTeamName}</p>
    </div>
    <p style="font-size: 14px; color: #555; margin: 0;">
      No action is required from you. If this looks wrong, contact your teammate or reach out to the organisers.
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

Hi ${p2Name},

${p1Name} (Participant 1) has updated your team name.

Previous name: ${previousTeamName}
New name: ${newTeamName}

No action is required from you.

---
GYANA SPARDHA – Odisha Quiz Competition. This is an automated message.
  `.trim()

  return { subject, html, text }
}
