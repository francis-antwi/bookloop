import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client';

// Helper function for consistent error responses
const errorResponse = (message: string, status: number, details?: any) => {
  return NextResponse.json(
    { 
      success: false,
      error: message,
      ...(details && { details }) 
    },
    { status }
  );
};

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    if (!token?.email) {
      return errorResponse('Authentication required', 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
      select: {
        id: true,
        email: true,
        role: true,
        isFaceVerified: true,
        isOtpVerified: true,
        selfieImage: true,
        idImage: true,
        hasSelectedRole: true,
        verified: true,
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return NextResponse.json(
      { 
        success: true,
        data: {
          requiresRoleSelection: !user.hasSelectedRole,
          requiresVerification: user.role === 'PROVIDER' && !user.isFaceVerified,
          ...user
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/role] Error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    if (!token?.email) {
      return errorResponse('Authentication required', 401);
    }

    const { role } = await req.json();
    
    if (!role || typeof role !== 'string') {
      return errorResponse('Role is required', 400);
    }

    const selectedRole = role.trim().toUpperCase();
    
    if (!Object.values(UserRole).includes(selectedRole as UserRole)) {
      return errorResponse('Invalid role specified', 400, {
        validRoles: Object.values(UserRole).filter(r => r !== 'ADMIN') // Typically users can't self-select ADMIN
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
      select: {
        id: true,
        role: true,
        isFaceVerified: true,
        isOtpVerified: true,
        selfieImage: true,
        idImage: true,
        verified: true
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Check if trying to change existing role
    if (user.role && user.role !== selectedRole) {
      return errorResponse('Role cannot be changed once set', 403);
    }

    // Provider-specific verification checks
    if (selectedRole === UserRole.PROVIDER) {
      if (!user.isFaceVerified || !user.verified) {
        return errorResponse('Face verification required for providers', 403, {
          requiresVerification: true
        });
      }

      if (!user.selfieImage || !user.idImage) {
        return errorResponse('ID and selfie uploads required for providers', 403, {
          requiresUploads: true
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { email: token.email },
      data: {
        role: selectedRole as UserRole,
        hasSelectedRole: true,
        ...(selectedRole === UserRole.CUSTOMER && { isOtpVerified: true }) // Auto-verify customers
      },
      select: {
        id: true,
        email: true,
        role: true,
        hasSelectedRole: true
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedUser,
        message: `Role successfully set to ${selectedRole}`,
        requiresSessionUpdate: true
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[POST /api/role] Error:', error);
    return errorResponse('Internal server error', 500);
  }
}