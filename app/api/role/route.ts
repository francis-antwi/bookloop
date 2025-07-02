import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client';

/**
 * POST /api/role
 * Allows an authenticated user to set their role to 'CUSTOMER' or 'PROVIDER'.
 * PROVIDER role requires prior face + ID verification.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate using token
    const token = await getToken({ req });

    if (!token || !token.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in first.' },
        { status: 401 }
      );
    }

    // 2. Parse role from request
    const { role } = await req.json();
    const normalizedRole = role?.toString().trim().toUpperCase();

    if (!normalizedRole || !(normalizedRole in UserRole)) {
      return NextResponse.json(
        { error: 'Invalid role', message: "Role must be 'CUSTOMER' or 'PROVIDER'." },
        { status: 400 }
      );
    }

    // 3. Lookup user
    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'Could not find the signed-in user in the database.' },
        { status: 404 }
      );
    }

    // 4. Block PROVIDER role if not verified
    if (
      normalizedRole === UserRole.PROVIDER &&
      (!user.isFaceVerified || !user.selfieImage || !user.idImage)
    ) {
      return NextResponse.json(
        {
          error: 'Verification required',
          message: 'You must complete face and ID verification before selecting Service Provider.',
        },
        { status: 403 }
      );
    }

    // 5. Skip update if role is unchanged
    if (user.role === normalizedRole) {
      return NextResponse.json(
        { success: true, message: `Role is already set to ${normalizedRole}.`, user },
        { status: 200 }
      );
    }

    // 6. Update role
    const updatedUser = await prisma.user.update({
      where: { email: token.email },
      data: {
        role: normalizedRole as UserRole,
        hasSelectedRole: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Your role has been updated to ${normalizedRole}.`,
        user: updatedUser,
        shouldRefreshSession: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[POST /api/role] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'Something went wrong while updating your role.',
      },
      { status: 500 }
    );
  }
}
