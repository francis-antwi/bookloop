import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  const cookieStore = cookies();
  console.log("🍪 Incoming Cookies:", cookieStore.getAll());

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  console.log("🔐 JWT Token:", token);

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
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 🆕 User doesn't exist yet (first-time Google login)
      user = await prisma.user.create({
        data: {
          email,
          name: token.name ?? "",
          image: token.picture ?? "",
          isOtpVerified: true,
          isFaceVerified: false,
          role: role as UserRole,
        },
      });

      return NextResponse.json(
        { success: true, message: "User created and role assigned" },
        { status: 201 }
      );
    }

    // ✅ User exists — check role
    if (user.role === role) {
      return NextResponse.json(
        { success: true, message: "Role already set" },
        { status: 200 }
      );
    }

    if (role === "PROVIDER") {
      if (
        !user.isFaceVerified ||
        !user.selfieImage ||
        !user.idImage
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

    // ✅ Update user role
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
