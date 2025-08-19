// File: app/api/user/business-info/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/app/libs/prismadb';
import authOptions from '@/app/auth/authOptions';


export async function GET(request: Request) {
  try {
    console.log('Business info API called');
    
    // Get the server session
    const session = await getServerSession(authOptions);
    
    console.log('Session data:', session);

    if (!session?.user?.email) {
      console.log('Unauthorized: No session or user email');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('User email from session:', session.user.email);

    // Get user with business verification info using email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        businessVerification: {
          select: {
            id: true,
            businessType: true,
            verified: true,
            allowedCategories: true,
            submittedAt: true
          }
        }
      }
    });

    if (!user) {
      console.log('User not found in database');
      return new NextResponse('User not found', { status: 404 });
    }

    console.log('User found:', user.email);

    // Determine allowed categories based on verification status
    let allowedCategories: string[] = [];
    let businessVerified = user.businessVerified || false;

    if (user.businessVerification) {
      businessVerified = user.businessVerification.verified || businessVerified;
      allowedCategories = user.businessVerification.allowedCategories || [];
    }

    // If no business verification exists, check if user has businessType set directly
    if (!user.businessVerification && user.category) {
      allowedCategories = [user.category];
      businessVerified = true;
    }

    const responseData = {
      businessVerified,
      hasBusinessVerification: !!user.businessVerification,
      businessVerification: user.businessVerification ? {
        id: user.businessVerification.id,
        verified: user.businessVerification.verified,
        allowedCategories,
        businessType: user.businessVerification.businessType,
        submittedAt: user.businessVerification.submittedAt
      } : null
    };

    console.log('Response data:', responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[BUSINESS_INFO_GET_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}