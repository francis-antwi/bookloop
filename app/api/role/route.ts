import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || !token.email) {
    console.error("❌ No session or token found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = token.email;
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
      user = await prisma.user.create({
        data: {
          email,
          name: token.name ?? "",
          image: token.picture ?? "",
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

    if (role === "PROVIDER" && (!user.isFaceVerified || !user.selfieImage || !user.idImage)) {
      return NextResponse.json(
        { error: "Verification required", message: "Complete identity verification to become a provider" },
        { status: 403 }
      );
    }

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
