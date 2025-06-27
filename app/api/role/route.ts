import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { role } = body;

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
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        role: true,
        isFaceVerified: true,
        selfieImage: true,
        idImage: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentUser.role === role) {
      return NextResponse.json(
        { success: true, message: "Role already set" },
        { status: 200 }
      );
    }

    if (role === "PROVIDER") {
      if (
        !currentUser.isFaceVerified ||
        !currentUser.selfieImage ||
        !currentUser.idImage
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

    await prisma.user.update({
      where: { email: session.user.email },
      data: { role },
    });

    return NextResponse.json(
      { success: true, message: "Role updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Role update error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to update role",
      },
      { status: 500 }
    );
  }
}
