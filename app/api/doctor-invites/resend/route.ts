import { NextRequest, NextResponse } from "next/server";
import { doctorInvitesService } from "@/services/firestore/doctor-invites.service";
import { sendDoctorInviteEmail } from "@/services/email/email.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteId } = body;

    if (!inviteId) {
      return NextResponse.json(
        { error: "Missing invite ID" },
        { status: 400 }
      );
    }

    // Get the invite
    const invite = await doctorInvitesService.getById(inviteId);
    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    if (invite.status === "completed") {
      return NextResponse.json(
        { error: "Cannot resend completed invite" },
        { status: 400 }
      );
    }

    if (invite.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot resend cancelled invite" },
        { status: 400 }
      );
    }

    // Generate new token and resend
    const newToken = doctorInvitesService["generateToken"]();
    const updatedInvite = await doctorInvitesService.resend(inviteId, newToken);

    // Generate new invite link
    const link = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/invite/${newToken}`;
    const expiryDate = updatedInvite.expiresAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Send email
    try {
      await sendDoctorInviteEmail(invite.email, {
        doctorName: invite.specialization || "Doctor",
        inviteLink: link,
        expiryDate,
      });
    } catch (emailError) {
      console.warn("Email service not configured, but invite was resent:", emailError);
    }

    return NextResponse.json({
      success: true,
      invite: updatedInvite,
      inviteLink: link,
    });
  } catch (error: any) {
    console.error("Resend invite error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resend invite" },
      { status: 500 }
    );
  }
}
