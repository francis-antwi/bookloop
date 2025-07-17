import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { NotificationType } from "@prisma/client";

const secret = process.env.NEXTAUTH_SECRET!;

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  return NextResponse.json({ message: "Route is working", userId: params.userId });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  console.log("🔍 PATCH endpoint hit with userId:", params.userId);

  // 1. Extract and validate token
  const token = await getToken({ req, secret });

  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = params;

  let status: string;
  let notes: string | null;

  try {
    const body = await req.json();
    console.log("📝 Request body:", body);
    status = body.status;
    notes = body.notes || null;
  } catch (error) {
    console.error("❌ Error parsing request body:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // 2. Validate status input
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be 'APPROVED' or 'REJECTED'." },
      { status: 400 }
    );
  }

  const isApproved = status === "APPROVED";

  try {
    // 3. Ensure verification record exists
    const existingVerification = await prisma.businessVerification.findUnique({
      where: { userId },
    });

    if (!existingVerification) {
      return NextResponse.json(
        { error: "Business verification record not found for this user." },
        { status: 404 }
      );
    }

    // 4. Get provider user data
    const provider = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // 5. Perform atomic update of user + businessVerification
    const [updatedUser, updatedVerification] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { businessVerified: isApproved },
      }),
      prisma.businessVerification.update({
        where: { userId },
        data: {
          verified: isApproved,
          verificationNotes: notes || (isApproved
            ? "Business approved by admin."
            : "Business rejected by admin."),
          updatedAt: new Date(),
        },
      }),
    ]);

    // 6. Auto-create notification for the provider
    const message = isApproved
      ? "🎉 Your business application has been approved. You can now list your services!"
      : `❌ Your business application was rejected.${notes ? ` Reason: ${notes}` : ""}`;

    await prisma.notification.create({
      data: {
        userId: provider.id,
        type: NotificationType.SYSTEM,
        message,
        email: provider.email,
        adminOnly: false,
      },
    });

    return NextResponse.json({
      success: true,
      businessVerified: updatedUser.businessVerified,
      verification: updatedVerification,
    });

  } catch (error) {
    console.error("❌ Error during provider approval update:", error);
    return NextResponse.json(
      { error: "Internal server error during provider status update." },
      { status: 500 }
    );
  }
}
