import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { NotificationType, UserRole } from "@prisma/client";

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

  const token = await getToken({ req, secret });
  console.log("🔐 Token:", token);

  let role = token?.role;

  if (!role && token?.email) {
    const user = await prisma.user.findUnique({
      where: { email: token.email },
      select: { role: true },
    });
    role = user?.role ?? null;
    console.log("📦 Fallback role from DB:", role);
  }

  if (!token || role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = params;
  let businessVerified: boolean;
  let notes: string | null;

  try {
    const body = await req.json();
    console.log("📝 Request body:", body);

    if (typeof body.businessVerified !== "boolean") {
      return NextResponse.json(
        { error: "Invalid 'businessVerified' value. Must be boolean." },
        { status: 400 }
      );
    }

    businessVerified = body.businessVerified;
    notes = body.notes || null;

  } catch (error) {
    console.error("❌ Error parsing request body:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const existingVerification = await prisma.businessVerification.findUnique({
      where: { userId },
    });

    if (!existingVerification) {
      return NextResponse.json(
        { error: "Business verification record not found for this user." },
        { status: 404 }
      );
    }

    const provider = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const [updatedUser, updatedVerification] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { businessVerified },
      }),
      prisma.businessVerification.update({
        where: { userId },
        data: {
          verified: businessVerified,
          verificationNotes:
            notes || (businessVerified
              ? "Business approved by admin."
              : "Business rejected by admin."),
          updatedAt: new Date(),
        },
      }),
    ]);

    const message = businessVerified
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
    console.error("❌ Error during business verification update:", error);
    return NextResponse.json(
      { error: "Internal server error during business verification update." },
      { status: 500 }
    );
  }
}
