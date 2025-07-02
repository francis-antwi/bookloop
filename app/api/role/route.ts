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
    // 1. Authenticate the user using the JWT token
    const token = await getToken({ req });

    if (!token || !token.email) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    // 2. Extract and normalize role from request body
    const { role } = await req.json();
    const normalizedRole = role?.toString().trim().toUpperCase();

    // 3. Validate role against the UserRole enum
    if (!normalizedRole || !(normalizedRole in UserRole)) {
      return NextResponse.json(
        { error: "Invalid role", message: "Role must be either 'CUSTOMER' or 'PROVIDER'." },
        { status: 400 }
      );
    }

    // 4. Fetch user by email
    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "The user associated with this session could not be found." },
        { status: 404 }
      );
    }

    // 5. Enforce verification if role is PROVIDER
    if (
      normalizedRole === UserRole.PROVIDER &&
      (!user.isFaceVerified || !user.selfieImage || !user.idImage)
    ) {
      console.warn(`[ROLE BLOCKED] ${user.email} attempted to select PROVIDER without verification.`);
      return NextResponse.json(
        {
          error: "Verification required",
          message: "Face and ID verification must be completed before becoming a Service Provider.",
        },
        { status: 403 }
      );
    }

    // 6. No update needed if role already matches
    if (user.role === normalizedRole) {
      return NextResponse.json(
        {
          success: true,
          message: `Role is already set to ${normalizedRole}.`,
          user,
        },
        { status: 200 }
      );
    }

    // 7. Update user role (and optionally mark role selected)
    const updatedUser = await prisma.user.update({
      where: { email: token.email },
      data: {
        role: normalizedRole as UserRole,
        hasSelectedRole: true, // Optional: if you track this separately
      },
    });

    // 8. Return updated user
    return NextResponse.json(
      {
        success: true,
        message: `Your role has been successfully updated to ${normalizedRole}.`,
        user: updatedUser,
        shouldRefreshSession: true, // for frontend session rehydration
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API Error: Role update failed:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message || "An unexpected error occurred while updating your role.",
      },
      { status: 500 }
    );
  }
}
