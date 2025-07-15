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

  const { role } = await req.json();

  if (!role || !["CUSTOMER", "PROVIDER"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Allowed roles: CUSTOMER, PROVIDER", redirect: "/role" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: token.email },
      select: {
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", redirect: "/" },
        { status: 404 }
      );
    }

    // 🚫 If role is already set and different, reject change
    if (user.role && user.role !== role) {
      return NextResponse.json(
        {
          error: "Role change not allowed",
          message: `Your role is already set to '${user.role}'.`,
          redirect: user.role === "PROVIDER" ? "/verify" : "/",
        },
        { status: 403 }
      );
    }

    // ✅ If same role already set, just return redirect
    if (user.role === role) {
      return NextResponse.json(
        {
          success: true,
          message: `Role already set to ${role}`,
          redirect: role === "PROVIDER" ? "/verify" : "/",
        },
        { status: 200 }
      );
    }

    // ✅ Save role immediately
    await prisma.user.update({
      where: { email: token.email },
      data: {
        role,
        ...(role === "PROVIDER" && {
          verified: false,
          requiresApproval: true,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Role set successfully",
        redirect: role === "PROVIDER" ? "/verify" : "/",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("🔥 Role update error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update role",
        redirect: "/role",
      },
      { status: 500 }
    );
  }
}
