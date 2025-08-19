// File: app/api/user/business-info/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/app/libs/prismadb';

// Import authOptions - adjust this path to match your actual auth options file
// Common locations:
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
// or
// import { authOptions } from '@/app/auth/authOptions';
// or
// import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    console.log('Business info API called'); // Debug log
    
    // Get the server session with the request context
    const session = await getServerSession(authOptions);
    
    console.log('Session data:', session); // Debug log

    if (!session?.user?.id) {
      console.log('Unauthorized: No session or user ID');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('User ID from session:', session.user.id); // Debug log

    // Get user with business verification info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    console.log('User found:', user.email); // Debug log

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

    console.log('Response data:', responseData); // Debug log

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[BUSINESS_INFO_GET_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}