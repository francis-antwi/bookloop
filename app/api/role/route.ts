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

  const { role } = body;

  if (!role) {
    return NextResponse.json(
      { error: "Bad Request", message: "Role is required" },
      { status: 400 }
    );
  }

  if (!["CUSTOMER", "PROVIDER"].includes(role)) {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid role provided" },
      { status: 400 }
    );
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
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

      return NextResponse.json(
        { success: true, message: "User created with role" },
        { status: 201 }
      );
    }

    if (user.role === role) {
      return NextResponse.json(
        { success: true, message: "Role already set" },
        { status: 200 }
      );
    }

    if (
      role === "PROVIDER" &&
      (!user.isFaceVerified || !user.selfieImage || !user.idImage)
    ) {
      return NextResponse.json(
        {
          error: "Verification required",
          message: "You must complete ID and face verification to be a provider",
        },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { email },
      data: { role: role as UserRole },
    });

    return NextResponse.json(
      { success: true, message: "Role updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Something went wrong",
      },
      { status: 500 }
    );
  }
}
