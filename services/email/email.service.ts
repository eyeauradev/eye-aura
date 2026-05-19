/**
 * Client-side email service — calls Next.js API routes which use
 * RESEND_API_KEY (server-only, never exposed to the browser) to send emails.
 */

export interface DoctorInviteEmailProps {
  doctorName: string;
  inviteLink: string;
  expiryDate: string;
}

/**
 * Send a doctor invite email via the /api/emails/doctor-invite server route.
 * Safe to call from client components — API key stays server-side.
 */
export async function sendDoctorInviteEmail(
  email: string,
  props: DoctorInviteEmailProps
): Promise<void> {
  const response = await fetch("/api/emails/doctor-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, ...props }),
  });

  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error || "Failed to send invite email");
  }
}
