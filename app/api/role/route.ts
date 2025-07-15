// /api/role/route.ts
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

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }
  if (!["CUSTOMER", "PROVIDER"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role", redirect: "/role" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: token.email },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found", redirect: "/" }, { status: 404 });
    }

    /* ---- 1. Role already set and different → block ---- */
    if (user.role && user.role !== role) {
      return NextResponse.json(
        {
          error: "Role change not allowed",
          redirect: user.role === "PROVIDER" ? "/verify" : "/",
        },
        { status: 403 }
      );
    }

    /* ---- 2. First‑time role assignment ---- */
    if (!user.role) {
      await prisma.user.update({
        where: { email: token.email },
        data: {
          role,
          ...(role === "PROVIDER" && {
            verified: false,          // ⇠ not verified yet
            requiresApproval: true,   // ⇠ admin must review
          }),
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Role set",
          redirect: role === "PROVIDER" ? "/verify" : "/",
        },
        { status: 200 }
      );
    }

    /* ---- 3. Role already matches (existing user) ---- */
    return NextResponse.json(
      { success: true, message: `Role already ${role}`, redirect: "/" },
      { status: 200 }
    );
  } catch (err) {
    console.error("🔥 role POST error:", err);
    return NextResponse.json(
      { error: "Internal error", redirect: "/role" },
      { status: 500 }
    );
  }
}
