import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/app/libs/email";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  }

  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.user.update({
    where: { email },
    data: {
      resetToken: token,
      resetTokenExpiry: expiry,
    },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(email, resetUrl);

  return NextResponse.json({ message: "Password reset email sent." });
}
