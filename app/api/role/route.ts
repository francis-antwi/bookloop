import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/authOptions";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    console.warn("⚠️ No session or email found.");
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
    console.warn("⚠️ Invalid JSON body received.");
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { role } = body;

  console.log(`🔁 Role request received: ${role}`);

  if (!role) {
    console.warn("⚠️ Role is missing from request body.");
    return NextResponse.json(
      { error: "Bad Request", message: "Role is required" },
      { status: 400 }
    );
  }

  if (!["CUSTOMER", "PROVIDER"].includes(role)) {
    console.warn(`⚠️ Invalid role provided: ${role}`);
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid role provided" },
      { status: 400 }
    );
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log("🆕 Creating new user with role:", role);
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
      console.log("ℹ️ Role already set:", role);
      return NextResponse.json(
        { success: true, message: "Role already set" },
        { status: 200 }
      );
    }

    if (
      role === "PROVIDER" &&
      (!user.isFaceVerified || !user.selfieImage || !user.idImage)
    ) {
      console.warn("🚫 Verification required for PROVIDER role.");
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

    console.log(`✅ Role updated to ${role} for user: ${email}`);

    return NextResponse.json(
      { success: true, message: "Role updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Role update error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Something went wrong",
      },
      { status: 500 }
    );
  }
}
