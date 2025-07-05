import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

const secret = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret });

  if (!token?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { role } = body;

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  if (!["CUSTOMER", "PROVIDER"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Allowed roles: CUSTOMER, PROVIDER" },
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

    // 🚫 Prevent changing to a different role once it's set
    if (user.role && user.role !== role) {
      return NextResponse.json(
        {
          error: "Role change not allowed",
          message: `Your role is already set to '${user.role}'.`,
        },
        { status: 403 }
      );
    }

    // ✅ If the role is already set and matches, just redirect to /
    if (user.role === role) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // ✅ If PROVIDER, ensure all verification fields are met
    if (role === "PROVIDER") {
      const missingVerification =
        !user.isFaceVerified || !user.selfieImage || !user.idImage;

      if (missingVerification) {
        return NextResponse.json(
          {
            error: "Verification required",
            message:
              "You must complete identity verification to become a provider.",
          },
          { status: 403 }
        );
      }
    }

    // ✅ Update the role
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
        error: "Internal Server Error",
        message: "Failed to update role",
      },
      { status: 500 }
    );
  }
}
