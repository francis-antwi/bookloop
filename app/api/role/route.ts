import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No token or email" },
        { status: 401 }
      );
    }

    const { role } = await req.json();
    const normalizedRole = role?.toUpperCase();

    if (!normalizedRole || !["CUSTOMER", "PROVIDER"].includes(normalizedRole)) {
      return NextResponse.json(
        { error: "Invalid role", message: "Role must be CUSTOMER or PROVIDER" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Block PROVIDER upgrade if not verified
    if (
      normalizedRole === "PROVIDER" &&
      (!user.isFaceVerified || !user.selfieImage || !user.idImage)
    ) {
      return NextResponse.json(
        {
          error: "Verification required",
          message: "Face and ID verification must be completed before becoming a PROVIDER",
        },
        { status: 403 }
      );
    }

    // If already set to same role, skip update
    if (user.role === normalizedRole) {
      return NextResponse.json(
        { success: true, message: "Role already set", user },
        { status: 200 }
      );
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { email: token.email },
      data: { role: normalizedRole as UserRole },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Role updated successfully",
        user: updatedUser,
        shouldRefreshSession: true, // ✅ Optional flag for frontend
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Role update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
