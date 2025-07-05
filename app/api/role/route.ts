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

    // ✅ If the same role is already set, return a redirect path
    if (user.role === role) {
      const redirectPath = role === "PROVIDER" ? "/verify" : "/";
      return NextResponse.json(
        {
          success: true,
          message: `Role already set to ${role}`,
          redirect: redirectPath, // ✅ Add redirect field for frontend to handle
        },
        { status: 200 }
      );
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
            redirect: "/verify", // ✅ Added for client-side redirect
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
        redirect: "/verify",
      },
       { status: 403 }
    );
  }
}
