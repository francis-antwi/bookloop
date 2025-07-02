import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

/**
 * POST /api/role
 * Updates the authenticated user's role to either 'CUSTOMER' or 'PROVIDER'.
 * Enforces verification rules for PROVIDERs and returns updated user info.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Get user token
    const token = await getToken({ req });

    if (!token?.email) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    // 2. Extract and normalize role
    const body = await req.json();
    const rawRole: string | undefined = body.role;
    const normalizedRole = rawRole?.trim().toUpperCase();

    // 3. Validate role
    if (!normalizedRole || !Object.values(UserRole).includes(normalizedRole as UserRole)) {
      return NextResponse.json(
        { error: "Invalid role", message: "Role must be either 'CUSTOMER' or 'PROVIDER'." },
        { status: 400 }
      );
    }

    // 4. Get user from DB
    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "No user found for current session." },
        { status: 404 }
      );
    }

    // 5. Block PROVIDER if not verified
    if (
      normalizedRole === UserRole.PROVIDER &&
      (!user.isFaceVerified || !user.selfieImage || !user.idImage)
    ) {
      console.warn(`[ROLE BLOCKED] Unverified user (${user.email}) attempted PROVIDER role.`);
      return NextResponse.json(
        {
          error: "Verification required",
          message: "You must complete ID and face verification before selecting PROVIDER role.",
        },
        { status: 403 }
      );
    }

    // 6. No change needed
    if (user.role === normalizedRole) {
      return NextResponse.json(
        {
          success: true,
          message: `You already have the '${normalizedRole}' role.`,
          user,
        },
        { status: 200 }
      );
    }

    // 7. Update role
    const updatedUser = await prisma.user.update({
      where: { email: token.email },
      data: {
        role: normalizedRole as UserRole,
        hasSelectedRole: true,
      },
    });

    // 8. Return updated info
    return NextResponse.json(
      {
        success: true,
        message: `Role updated to ${normalizedRole}.`,
        user: updatedUser,
        shouldRefreshSession: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Role API error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message || "An error occurred while updating role.",
      },
      { status: 500 }
    );
  }
}
