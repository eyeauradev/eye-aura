import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

interface DoctorInviteEmailProps {
  doctorName: string;
  inviteLink: string;
  expiryDate: string;
}

export async function sendDoctorInviteEmail(
  email: string,
  props: DoctorInviteEmailProps
): Promise<void> {
  try {
    await resend.emails.send({
      from: "Eye Aura <onboarding@resend.dev>",
      to: email,
      subject: "You're invited to join Eye Aura as a Doctor",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Eye Aura</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #F7F4EF;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 32px;
              }
              .logo {
                width: 64px;
                height: 64px;
                background-color: #0F4F4B;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
              }
              .logo svg {
                width: 32px;
                height: 32px;
                color: white;
              }
              h1 {
                color: #0F4F4B;
                font-size: 24px;
                margin: 0 0 8px 0;
              }
              .subtitle {
                color: #666;
                font-size: 16px;
                margin: 0;
              }
              .content {
                margin-bottom: 32px;
              }
              .greeting {
                color: #333;
                font-size: 16px;
                margin-bottom: 16px;
              }
              .message {
                color: #666;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 24px;
              }
              .cta-button {
                display: inline-block;
                background-color: #0F4F4B;
                color: white;
                padding: 14px 28px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 24px;
              }
              .cta-button:hover {
                background-color: #1A6B66;
              }
              .warning {
                background-color: #FFF3CD;
                border: 1px solid #FFC107;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 24px;
              }
              .warning p {
                color: #856404;
                margin: 0;
                font-size: 14px;
              }
              .footer {
                text-align: center;
                color: #999;
                font-size: 12px;
                padding-top: 24px;
                border-top: 1px solid #eee;
              }
              .footer p {
                margin: 4px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <h1>Eye Aura</h1>
                <p class="subtitle">Digital Eye Wellness Platform</p>
              </div>
              
              <div class="content">
                <p class="greeting">Hello ${props.doctorName},</p>
                <p class="message">
                  You've been invited to join Eye Aura as a doctor on our platform. 
                  Eye Aura is a premium tele-optometry platform connecting patients with eye care professionals.
                </p>
                <p class="message">
                  To complete your onboarding and set up your account, please click the button below:
                </p>
                <a href="${props.inviteLink}" class="cta-button">Complete Onboarding</a>
                
                <div class="warning">
                  <p><strong>Important:</strong> This invite link expires on ${props.expiryDate}. Please complete your onboarding before this date.</p>
                </div>
                
                <p class="message">
                  If you have any questions or didn't expect this invitation, please contact our support team.
                </p>
              </div>
              
              <div class="footer">
                <p>Eye Aura - Premium Digital Eye Wellness</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Failed to send doctor invite email:", error);
    throw new Error("Failed to send invite email");
  }
}
