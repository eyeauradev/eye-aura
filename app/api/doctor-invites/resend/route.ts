import { NextRequest, NextResponse } from "next/server";
import { doctorInvitesService } from "@/services/firestore/doctor-invites.service";
import { sendDoctorInviteEmail } from "@/lib/send-email";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const { inviteId } = await request.json();

    if (!inviteId) {
      return NextResponse.json({ error: "Missing invite ID" }, { status: 400 });
    }

    const invite = await doctorInvitesService.getById(inviteId);
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status === "completed") {
      return NextResponse.json({ error: "Cannot resend a completed invite" }, { status: 400 });
    }
    if (invite.status === "cancelled") {
      return NextResponse.json({ error: "Cannot resend a cancelled invite" }, { status: 400 });
    }

    const updatedInvite = await doctorInvitesService.resend(inviteId);

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const inviteLink = `${origin}/invite/${updatedInvite.token}`;
    const expiryDate = updatedInvite.expiresAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    await sendDoctorInviteEmail({
      to: invite.email,
      doctorName: invite.doctorName || invite.specialization || "Doctor",
      inviteLink,
      expiryDate,
    });

    return NextResponse.json({ success: true, invite: updatedInvite, inviteLink });
  } catch (error: any) {
    console.error("Resend invite error:", error);
    logServerError({
      code: ERROR_CODES.DOCTOR.OPERATION_FAILED,
      title: "Doctor Invite Failed",
      message: "Failed to resend doctor invite",
      originalError: error,
      context: "doctor-invites/resend",
    });
    return NextResponse.json(
      { error: error.message || "Failed to resend invite" },
      { status: 500 }
    );
  }
}
