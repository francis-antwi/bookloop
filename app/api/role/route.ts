import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

const secret = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret });

  console.log("🔐 Token:", token); // TEMP for debugging – remove in production

  if (!token?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { role, userId } = body;

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  if (!["CUSTOMER", "PROVIDER"].includes(role)) {
    return NextResponse.json(
      {
        error: "Invalid role",
        message: "Allowed roles: CUSTOMER, PROVIDER",
      },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: token.email },
      select: {
        role: true,
        isFaceVerified: true,
        selfieImage: true,
        idImage: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 🚫 Prevent changing role after it's initially set
    if (user.role && user.role !== role) {
      return NextResponse.json(
        {
          success: false,
          error: "Role change not allowed",
          message: `You have already selected a role: ${user.role}`,
        },
        { status: 403 }
      );
    }

    // ✅ If the same role is already set, return success
    if (user.role === role) {
      return NextResponse.json(
        { success: true, message: `Role already set to ${role}` },
        { status: 200 }
      );
    }

    // ✅ If selecting PROVIDER, ensure verification requirements
    if (role === "PROVIDER") {
      if (
        !user.isFaceVerified ||
        !user.selfieImage ||
        !user.idImage
      ) {
        return NextResponse.json(
          {
            error: "Verification required",
            message: "Complete identity verification to become a provider",
          },
          { status: 403 }
        );
      }
    }

    // ✅ Update role
    await prisma.user.update({
      where: { email: token.email },
      data: { role },
    });

    return NextResponse.json(
      { success: true, message: "Role updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("🔥 Role update error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to update role",
      },
      { status: 500 }
    );
  }
}
