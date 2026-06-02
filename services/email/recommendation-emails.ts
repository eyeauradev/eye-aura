/**
 * Email templates for recommendation lifecycle events.
 *
 * Each function returns { subject, html } content for sending via Resend.
 * Uses professional clinical language ("recommended" not "prescribed").
 * The API routes will call these templates and handle actual sending.
 */

export interface RecommendationEmailContext {
  serviceName: string;
  doctorName: string;
  patientName: string;
  slotDate: string; // formatted date string
  slotTime: string; // formatted time string
  clinicalNote?: string;
  recommendationId: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

function truncateNote(note?: string, maxLength = 150): string {
  if (!note) return "";
  if (note.length <= maxLength) return note;
  return note.slice(0, maxLength) + "...";
}

function baseEmailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eye Aura</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F7F4EF; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { text-align: center; margin-bottom: 32px; }
      h1 { color: #0F4F4B; font-size: 24px; margin: 0 0 8px 0; }
      h2 { color: #0F4F4B; font-size: 20px; margin: 0 0 16px 0; }
      .subtitle { color: #666; font-size: 16px; margin: 0; }
      p { color: #333; font-size: 14px; line-height: 1.6; }
      .muted { color: #666; }
      .detail-box { background-color: #F7F4EF; border-radius: 12px; padding: 20px; margin: 16px 0; }
      .detail-row { display: flex; margin-bottom: 8px; }
      .detail-label { color: #666; font-size: 13px; min-width: 120px; font-weight: 500; }
      .detail-value { color: #0F4F4B; font-size: 14px; font-weight: 600; }
      .clinical-note { background-color: #EEF7F6; border-left: 3px solid #0F4F4B; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
      .clinical-note p { color: #333; font-style: italic; margin: 0; }
      .cta-button { display: inline-block; background-color: #0F4F4B; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 16px 0; }
      .footer { text-align: center; color: #999; font-size: 12px; padding-top: 24px; border-top: 1px solid #eee; margin-top: 32px; }
      .footer p { margin: 4px 0; color: #999; }
      .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
      .status-pending { background-color: #FFF3CD; color: #856404; }
      .status-accepted { background-color: #D4EDDA; color: #155724; }
      .status-declined { background-color: #F8D7DA; color: #721C24; }
      .status-cancelled { background-color: #E2E3E5; color: #383D41; }
      .status-expired { background-color: #E2E3E5; color: #383D41; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Eye Aura</h1>
        <p class="subtitle">Digital Eye Wellness Platform</p>
      </div>
      ${content}
      <div class="footer">
        <p>Eye Aura &mdash; Premium Digital Eye Wellness</p>
        <p>This is an automated email. Please do not reply.</p>
      </div>
    </div>
  </body>
</html>`;
}

/**
 * Email sent to the patient when a doctor recommends a service.
 */
export function recommendationCreatedEmail(context: RecommendationEmailContext): EmailTemplate {
  const { serviceName, doctorName, slotDate, slotTime, clinicalNote } = context;

  const noteSection = clinicalNote
    ? `<div class="clinical-note"><p><strong>Clinical Note:</strong> ${truncateNote(clinicalNote)}</p></div>`
    : "";

  const content = `
    <h2>New Service Recommended</h2>
    <p>Hello,</p>
    <p>Dr. ${doctorName} has recommended a service for you based on your recent consultation.</p>

    <div class="detail-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Service</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${serviceName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Doctor</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">Dr. ${doctorName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Date</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotDate}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Time</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotTime}</td></tr>
      </table>
    </div>

    ${noteSection}

    <p class="muted">Please log in to your Eye Aura account to review this recommendation and respond within 7 days.</p>
    <p class="muted">If you have any questions, please contact Dr. ${doctorName} during your next visit.</p>
  `;

  return {
    subject: `Dr. ${doctorName} has recommended ${serviceName} for you`,
    html: baseEmailWrapper(content),
  };
}

/**
 * Email sent to the doctor when a patient accepts the recommendation.
 */
export function recommendationAcceptedEmail(context: RecommendationEmailContext): EmailTemplate {
  const { serviceName, patientName, slotDate, slotTime } = context;

  const content = `
    <h2>Recommendation Accepted</h2>
    <p>Hello Dr.,</p>
    <p>${patientName} has accepted your recommended service and completed payment.</p>

    <div class="detail-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Service</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${serviceName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Patient</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${patientName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Date</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotDate}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Time</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotTime}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Status</td><td style="padding: 4px 0;"><span class="status-badge status-accepted">Accepted</span></td></tr>
      </table>
    </div>

    <p class="muted">The appointment has been confirmed and the time slot has been blocked in your schedule.</p>
  `;

  return {
    subject: `${patientName} accepted your recommended ${serviceName}`,
    html: baseEmailWrapper(content),
  };
}

/**
 * Email sent to the doctor when a patient declines the recommendation.
 */
export function recommendationDeclinedEmail(
  context: RecommendationEmailContext & { declineReason?: string }
): EmailTemplate {
  const { serviceName, patientName, slotDate, slotTime, declineReason } = context;

  const reasonSection = declineReason
    ? `<div class="clinical-note"><p><strong>Patient's reason:</strong> ${truncateNote(declineReason)}</p></div>`
    : "";

  const content = `
    <h2>Recommendation Declined</h2>
    <p>Hello Dr.,</p>
    <p>${patientName} has declined your recommended service.</p>

    <div class="detail-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Service</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${serviceName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Patient</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${patientName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Date</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotDate}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Time</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotTime}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Status</td><td style="padding: 4px 0;"><span class="status-badge status-declined">Declined</span></td></tr>
      </table>
    </div>

    ${reasonSection}

    <p class="muted">The reserved time slot has been released and is now available for other bookings.</p>
  `;

  return {
    subject: `${patientName} declined your recommended ${serviceName}`,
    html: baseEmailWrapper(content),
  };
}

/**
 * Email sent to the patient when the doctor cancels the recommendation.
 */
export function recommendationCancelledEmail(context: RecommendationEmailContext): EmailTemplate {
  const { serviceName, doctorName, slotDate, slotTime } = context;

  const content = `
    <h2>Recommendation Cancelled</h2>
    <p>Hello,</p>
    <p>Dr. ${doctorName} has cancelled the previously recommended service.</p>

    <div class="detail-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Service</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${serviceName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Doctor</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">Dr. ${doctorName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Original Date</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotDate}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Original Time</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotTime}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Status</td><td style="padding: 4px 0;"><span class="status-badge status-cancelled">Cancelled</span></td></tr>
      </table>
    </div>

    <p class="muted">No further action is required from you. If you have questions about your care plan, please contact Dr. ${doctorName} during your next consultation.</p>
  `;

  return {
    subject: `Recommendation cancelled: ${serviceName} by Dr. ${doctorName}`,
    html: baseEmailWrapper(content),
  };
}

/**
 * Email sent to both patient and doctor when a recommendation expires.
 * Call this function twice with appropriate recipientType.
 */
export function recommendationExpiredEmail(
  context: RecommendationEmailContext,
  recipientType: "patient" | "doctor"
): EmailTemplate {
  const { serviceName, doctorName, patientName, slotDate, slotTime } = context;

  if (recipientType === "patient") {
    const content = `
      <h2>Recommendation Expired</h2>
      <p>Hello,</p>
      <p>The service recommended by Dr. ${doctorName} has expired after 7 days without a response.</p>

      <div class="detail-box">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Service</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${serviceName}</td></tr>
          <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Doctor</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">Dr. ${doctorName}</td></tr>
          <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Original Date</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotDate}</td></tr>
          <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Original Time</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotTime}</td></tr>
          <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Status</td><td style="padding: 4px 0;"><span class="status-badge status-expired">Expired</span></td></tr>
        </table>
      </div>

      <p class="muted">The reserved time slot has been released. If you would still like to schedule this service, please contact Dr. ${doctorName} during your next consultation to receive a new recommendation.</p>
    `;

    return {
      subject: `Recommendation expired: ${serviceName} from Dr. ${doctorName}`,
      html: baseEmailWrapper(content),
    };
  }

  // Doctor recipient
  const content = `
    <h2>Recommendation Expired</h2>
    <p>Hello Dr.,</p>
    <p>Your recommended service for ${patientName} has expired after 7 days without a response.</p>

    <div class="detail-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Service</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${serviceName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Patient</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${patientName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Original Date</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotDate}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Original Time</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotTime}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Status</td><td style="padding: 4px 0;"><span class="status-badge status-expired">Expired</span></td></tr>
      </table>
    </div>

    <p class="muted">The reserved time slot has been released and is now available for other bookings. You may create a new recommendation for this patient if clinically appropriate.</p>
  `;

  return {
    subject: `Recommendation expired: ${serviceName} for ${patientName}`,
    html: baseEmailWrapper(content),
  };
}

/**
 * Email sent to the patient when the doctor edits a recommendation.
 */
export function recommendationEditedEmail(context: RecommendationEmailContext): EmailTemplate {
  const { serviceName, doctorName, slotDate, slotTime, clinicalNote } = context;

  const noteSection = clinicalNote
    ? `<div class="clinical-note"><p><strong>Updated Clinical Note:</strong> ${truncateNote(clinicalNote)}</p></div>`
    : "";

  const content = `
    <h2>Recommendation Updated</h2>
    <p>Hello,</p>
    <p>Dr. ${doctorName} has updated the details of your recommended service. Please review the new information below.</p>

    <div class="detail-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Service</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${serviceName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Doctor</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">Dr. ${doctorName}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Updated Date</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotDate}</td></tr>
        <tr><td style="color: #666; font-size: 13px; padding: 4px 0;">Updated Time</td><td style="color: #0F4F4B; font-size: 14px; font-weight: 600; padding: 4px 0;">${slotTime}</td></tr>
      </table>
    </div>

    ${noteSection}

    <p class="muted">Please log in to your Eye Aura account to review the updated recommendation and respond within the remaining time.</p>
  `;

  return {
    subject: `Updated recommendation: ${serviceName} from Dr. ${doctorName}`,
    html: baseEmailWrapper(content),
  };
}
