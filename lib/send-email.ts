import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured in the server environment");
  return new Resend(key);
}

export interface DoctorInviteEmailOptions {
  to: string;
  doctorName: string;
  inviteLink: string;
  expiryDate: string;
}

export async function sendDoctorInviteEmail({
  to,
  doctorName,
  inviteLink,
  expiryDate,
}: DoctorInviteEmailOptions): Promise<void> {
  const resend = getResend();

  await resend.emails.send({
    from: "Eye Aura <noreply@eyeaura.co.in>",
    to,
    subject: "You're invited to join Eye Aura as a Doctor",
    html: buildEmailHtml(doctorName, inviteLink, expiryDate),
  });
}

function buildEmailHtml(doctorName: string, inviteLink: string, expiryDate: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Eye Aura</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F7F4EF; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { text-align: center; margin-bottom: 32px; }
      .logo-circle { width: 64px; height: 64px; background-color: #0F4F4B; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
      h1 { color: #0F4F4B; font-size: 24px; margin: 0 0 8px 0; }
      .subtitle { color: #666; font-size: 16px; margin: 0; }
      p { color: #333; font-size: 14px; line-height: 1.6; }
      .muted { color: #666; }
      .cta-button { display: inline-block; background-color: #0F4F4B; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px 0 24px; }
      .warning { background-color: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
      .warning p { color: #856404; margin: 0; }
      .footer { text-align: center; color: #999; font-size: 12px; padding-top: 24px; border-top: 1px solid #eee; }
      .footer p { margin: 4px 0; color: #999; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Eye Aura</h1>
        <p class="subtitle">Digital Eye Wellness Platform</p>
      </div>

      <p>Hello ${doctorName},</p>
      <p class="muted">
        You've been invited to join Eye Aura as a doctor on our platform.
        Eye Aura is a premium tele-optometry platform connecting patients with eye care professionals.
      </p>
      <p class="muted">
        To complete your onboarding and set up your account, please click the button below:
      </p>

      <a href="${inviteLink}" class="cta-button">Complete Onboarding</a>

      <div class="warning">
        <p><strong>Important:</strong> This invite link expires on ${expiryDate}. Please complete your onboarding before this date.</p>
      </div>

      <p class="muted">
        If you have any questions or didn't expect this invitation, please contact our support team.
      </p>

      <div class="footer">
        <p>Eye Aura &mdash; Premium Digital Eye Wellness</p>
        <p>This is an automated email. Please do not reply.</p>
      </div>
    </div>
  </body>
</html>`;
}
