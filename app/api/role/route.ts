import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  // 🔐 Extract token (works in App Router)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

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

  console.log("🔹 Token email:", email);
  console.log("🔹 Requested role:", role);

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  if (!["CUSTOMER", "PROVIDER"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role", message: "Allowed roles: CUSTOMER, PROVIDER" },
      { status: 400 }
    );
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { email },
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
            message:
              "You must complete identity verification to become a provider",
          },
          { status: 403 }
        );
      }
    }

    await prisma.user.update({
      where: { email },
      data: { role: role as UserRole },
    });

    return NextResponse.json(
      { success: true, message: "Role updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Role update error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to update role" },
      { status: 500 }
    );
  }
}
