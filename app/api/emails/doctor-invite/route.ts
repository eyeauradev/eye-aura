import { NextRequest, NextResponse } from "next/server";
import { sendDoctorInviteEmail } from "@/lib/send-email";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";

interface RequestBody {
  email: string;
  doctorName: string;
  inviteLink: string;
  expiryDate: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { email, doctorName, inviteLink, expiryDate } = body;

    if (!email || !doctorName || !inviteLink || !expiryDate) {
      return NextResponse.json(
        { error: "Missing required fields: email, doctorName, inviteLink, expiryDate" },
        { status: 400 }
      );
    }

    await sendDoctorInviteEmail({ to: email, doctorName, inviteLink, expiryDate });

    return NextResponse.json({ success: true, message: "Email sent successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error sending doctor invite email:", error);
    logServerError({
      code: ERROR_CODES.API.SERVER_ERROR,
      title: "Email Error",
      message: "Failed to send doctor invite email",
      originalError: error,
      context: "emails/doctor-invite",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
