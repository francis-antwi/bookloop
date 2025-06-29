import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/authOptions";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized", message: "No session or email found" },
      { status: 401 }
    );
  }

  const email = session.user.email;

  let body: { role?: string } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const normalizedRole = body.role?.toUpperCase();

  if (!normalizedRole) {
    return NextResponse.json(
      { error: "Bad Request", message: "Role is required" },
      { status: 400 }
    );
  }

  if (!["CUSTOMER", "PROVIDER"].includes(normalizedRole)) {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid role provided" },
      { status: 400 }
    );
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // New user — safe to create
      user = await prisma.user.create({
        data: {
          email,
          name: session.user.name ?? "",
          image: session.user.image ?? "",
          isOtpVerified: true,
          isFaceVerified: false,
          role: normalizedRole as UserRole,
        },
      });

      return NextResponse.json(
        { success: true, message: "User created with role", user },
        { status: 201 }
      );
    }

    if (user.role === normalizedRole) {
      return NextResponse.json(
        { success: true, message: "Role already set", user },
        { status: 200 }
      );
    }

    if (
      normalizedRole === "PROVIDER" &&
      (!user.isFaceVerified || !user.selfieImage || !user.idImage)
    ) {
      return NextResponse.json(
        {
          error: "Verification required",
          message:
            "You must complete ID and face verification to be a provider",
        },
        { status: 403 }
      );
    }

    // Update role
    await prisma.user.update({
      where: { email },
      data: { role: normalizedRole as UserRole },
    });

    return NextResponse.json(
      { success: true, message: "Role updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[ROLE_API_ERROR]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Something went wrong",
      },
      { status: 500 }
    );
  }
}
