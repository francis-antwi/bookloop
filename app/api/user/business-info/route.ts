// File: app/api/user/business-info/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/libs/prismadb';

export async function GET(request: Request) {
  try {
    // Get the server session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user with business verification info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        businessVerification: {
          select: {
            id: true,
            businessType: true,
            verified: true,
            allowedCategories: true
          }
        }
      }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Determine allowed categories based on verification status
    let allowedCategories: string[] = [];
    let businessVerified = user.businessVerified || false;

    if (user.businessVerification) {
      businessVerified = user.businessVerification.verified || businessVerified;
      allowedCategories = businessVerified 
        ? user.businessVerification.allowedCategories 
        : [];
    }

    // If no business verification exists, check if user has businessType set directly
    if (!user.businessVerification && user.category) {
      allowedCategories = [user.category];
      businessVerified = true;
    }

    const responseData = {
      businessVerified,
      businessVerification: user.businessVerification ? {
        id: user.businessVerification.id,
        verified: user.businessVerification.verified,
        allowedCategories,
        businessType: user.businessVerification.businessType
      } : null
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[BUSINESS_INFO_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}