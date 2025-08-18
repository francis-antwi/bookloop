// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/app/libs/prismadb';
import authOptions from '@/app/auth/authOptions';

const ADMIN_EMAILS = [
  'sheamusticals@gmail.com',
  // Add other admin emails as needed
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔍 Fetching user with ID: ${params.id}`);
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ Unauthorized - No session found');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Debug logging for email comparison
    console.log('Admin emails:', ADMIN_EMAILS);
    console.log('Session email:', session.user.email);

    // Check admin authorization using email list (case insensitive)
    const normalizedAdminEmails = ADMIN_EMAILS.map(email => email.toLowerCase().trim());
    const userEmail = session.user.email.toLowerCase().trim();
    
    if (!normalizedAdminEmails.includes(userEmail)) {
      console.log(`❌ Forbidden - User ${session.user.email} is not admin`);
      return NextResponse.json(
        { error: 'Forbidden' }, 
        { status: 403 }
      );
    }

    // Validate user ID
    if (!params.id || typeof params.id !== 'string') {
      console.log('❌ Invalid user ID format');
      return NextResponse.json(
        { error: 'Invalid user ID' }, 
        { status: 400 }
      );
    }

    // Fetch user with related data
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        contactPhone: true,
        status: true,
        verified: true,
        businessVerified: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        listings: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
          take: 5
        },
        reservations: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
            createdAt: true,
          },
          take: 5
        },
      }
    });

    if (!user) {
      console.log(`❌ User not found with ID: ${params.id}`);
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    console.log(`✅ Found user: ${user.email}`);
    return NextResponse.json(user);

  } catch (error) {
    console.error('💥 Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`✏️ Updating user with ID: ${params.id}`);
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ Unauthorized - No session found');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Check admin authorization using email list (case insensitive)
    const normalizedAdminEmails = ADMIN_EMAILS.map(email => email.toLowerCase().trim());
    const userEmail = session.user.email.toLowerCase().trim();
    
    if (!normalizedAdminEmails.includes(userEmail)) {
      console.log(`❌ Forbidden - User ${session.user.email} is not admin`);
      return NextResponse.json(
        { error: 'Forbidden' }, 
        { status: 403 }
      );
    }

    // Validate user ID
    if (!params.id || typeof params.id !== 'string') {
      console.log('❌ Invalid user ID format');
      return NextResponse.json(
        { error: 'Invalid user ID' }, 
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, verified } = body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    });
    
    if (!existingUser) {
      console.log(`❌ User not found with ID: ${params.id}`);
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }
    
    // Build update data
    const updateData: any = {};
    
    if (status !== undefined) {
      console.log(`🔄 Updating status to: ${status}`);
      updateData.status = status;
    }
    
    if (verified !== undefined) {
      console.log(`🔄 Updating verified to: ${verified}`);
      updateData.verified = verified;
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        contactPhone: true,
        status: true,
        verified: true,
        businessVerified: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    console.log(`✅ Updated user: ${updatedUser.email}`);
    return NextResponse.json(updatedUser);
    
  } catch (error) {
    console.error('💥 Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}