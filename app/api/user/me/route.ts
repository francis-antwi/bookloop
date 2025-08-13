import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client';

export async function GET(request: Request) {
  try {
    // 1. Extract token from Authorization header
    const authHeader = headers().get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    // 2. Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      role?: UserRole;
      exp: number;
    };

    // 3. Check token expiration
    if (Date.now() >= decoded.exp * 1000) {
      return NextResponse.json(
        { error: 'Token expired', shouldRefresh: true },
        { status: 401 }
      );
    }

    // 4. Fetch user from database (UPDATED with requiresApproval)
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isFaceVerified: true,
        isOtpVerified: true,
        selfieImage: true,
        idImage: true,
        verified: true,
        hasSelectedRole: true,
        requiresApproval: true,
        category: true  // ✅ Include this
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 5. Return user data with requiresApproval
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFaceVerified: user.isFaceVerified,
        isOtpVerified: user.isOtpVerified,
        verified: user.verified,
        hasSelectedRole: user.hasSelectedRole,
        requiresApproval: user.requiresApproval, // ✅ Return it
        ...(user.role === 'PROVIDER' && {
          selfieImage: user.selfieImage,
          idImage: user.idImage,
        }),
      },
    });

  } catch (error: any) {
    console.error('[GET /api/user/me] Error:', error);

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid token', shouldRefresh: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
