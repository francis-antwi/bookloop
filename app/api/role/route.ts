import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  const token = await getToken({ req });

  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: token.email },
    select: {
      email: true,
      role: true,
      isFaceVerified: true,
      selfieImage: true,
      idImage: true,
      hasSelectedRole: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token || !token.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in first.' },
        { status: 401 }
      );
    }

    const { role } = await req.json();
    const normalizedRole = role?.toString().trim().toUpperCase();

    if (!normalizedRole || !(normalizedRole in UserRole)) {
      return NextResponse.json(
        { error: 'Invalid role', message: "Role must be 'CUSTOMER' or 'PROVIDER'." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'Could not find the signed-in user in the database.' },
        { status: 404 }
      );
    }

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

    if (user.role === normalizedRole) {
      return NextResponse.json(
        { success: true, message: `Role is already set to ${normalizedRole}.`, user },
        { status: 200 }
      );
    }

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
