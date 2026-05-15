/**
 * Email Service - Server-side email sending via API routes
 * 
 * WHY SERVER-SIDE API ROUTES:
 * - Resend API calls must originate from a server to avoid CORS errors
 * - Browser requests to https://api.resend.com/emails fail due to CORS policies
 * - API keys must never be exposed to the client browser bundle
 * - Server-side calls are more secure and follow proper architecture patterns
 * 
 * ARCHITECTURE:
 * - Frontend calls Next.js API routes (e.g., /api/emails/doctor-invite)
 * - API routes handle Resend SDK initialization with server-side env vars
 * - API keys are never exposed to the client
 * - This follows Next.js App Router best practices for external API calls
 */

interface DoctorInviteEmailProps {
  doctorName: string;
  inviteLink: string;
  expiryDate: string;
}

/**
 * Send doctor invite email via server-side API route
 * 
 * This function calls the Next.js API route which handles the actual Resend API call.
 * The API route runs server-side and has access to RESEND_API_KEY environment variable.
 * 
 * @param email - Doctor's email address
 * @param props - Email content (doctor name, invite link, expiry date)
 */
export async function sendDoctorInviteEmail(
  email: string,
  props: DoctorInviteEmailProps
): Promise<void> {
  try {
    // Call the server-side API route instead of calling Resend directly
    // This avoids CORS issues and keeps the API key secure on the server
    const response = await fetch("/api/emails/doctor-invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        ...props,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send email");
    }

    const data = await response.json();
    console.log("Email sent successfully:", data);
  } catch (error) {
    console.error("Failed to send doctor invite email:", error);
    throw new Error("Failed to send invite email");
  }
}
