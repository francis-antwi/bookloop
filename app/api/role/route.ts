import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/authOptions";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    console.error("❌ No session or user email found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  let role: string;

  try {
    const body = await req.json();
    role = body.role;
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  if (!["CUSTOMER", "PROVIDER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // First-time Google login — create user now
      user = await prisma.user.create({
        data: {
          email,
          name: session.user.name ?? "",
          image: session.user.image ?? "",
          isOtpVerified: true,
          isFaceVerified: false,
          role: role as UserRole,
        },
      });

      return NextResponse.json({ success: true, message: "User created" }, { status: 201 });
    }

    if (user.role === role) {
      return NextResponse.json({ success: true, message: "Role already set" }, { status: 200 });
    }

    // For PROVIDER, ensure verification
    if (role === "PROVIDER" && (!user.isFaceVerified || !user.selfieImage || !user.idImage)) {
      return NextResponse.json(
        {
          error: "Verification required",
          message: "Complete identity verification to become a provider",
        },
        { status: 403 }
      );
    }

    // Update role
    await prisma.user.update({
      where: { email },
      data: { role: role as UserRole },
    });

    return NextResponse.json({ success: true, message: "Role updated" }, { status: 200 });
  } catch (error) {
    console.error("❌ Role update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
