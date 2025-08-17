import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/app/libs/email";

export async function POST(req: Request) {
  const start = Date.now();
  const context: Record<string, any> = {};

  try {
    const { email } = await req.json();
    context.email = email;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always respond with a success message (prevent account enumeration)
    const successResponse = {
      message: "If that email exists, a reset link has been sent.",
    };

    if (!user) {
      return NextResponse.json(successResponse, { status: 200 });
    }

    // Optional: Invalidate previous tokens if needed (by overwriting)
    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(normalizedEmail, resetUrl);

    return NextResponse.json({ message: "Password reset email sent." }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Forgot Password Error", {
      error: error.message,
      context,
      tookMs: Date.now() - start,
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
