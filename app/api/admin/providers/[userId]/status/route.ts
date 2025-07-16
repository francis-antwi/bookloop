import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NotificationType } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);

  // 1. Authorization: Only ADMINs can proceed
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = params;
  let status: string;
  let notes: string | null;

  try {
    const body = await req.json();
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
    // Ensure verification record exists
    const existingVerification = await prisma.businessVerification.findUnique({
      where: { userId },
    });

    if (!existingVerification) {
      return NextResponse.json(
        { error: "Business verification record not found for this user." },
        { status: 404 }
      );
    }

    // Get provider user data
    const provider = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // 3. Perform atomic update of user + businessVerification
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

    // 4. Auto-create notification for the provider
    const message = isApproved
      ? "🎉 Your business application has been approved. You can now list your services!"
      : `❌ Your business application was rejected.${notes ? ` Reason: ${notes}` : ""}`;

await prisma.notification.create({
  data: {
    userId: provider.id,
    type: NotificationType.SYSTEM, // ✅ Correct enum usage
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
