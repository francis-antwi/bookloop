import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import bcrypt from "bcrypt";

/**
 * Handles password reset request
 * POST body: { token: string, newPassword: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      console.warn("⚠️ Missing token or new password:", { token, newPassword });
      return NextResponse.json(
        { error: "Missing token or new password." },
        { status: 400 }
      );
    }

    console.log("🔍 Looking for user with resetToken:", token);

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      console.warn("❌ Invalid or expired token:", token);
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log("🔐 Hashed new password for user:", user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    console.log("✅ Password successfully reset for:", user.email);

    return NextResponse.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
