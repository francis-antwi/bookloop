// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client';
import authOptions from '@/app/auth/authOptions';

// Handle GET request - fetch users
export async function GET(request: NextRequest) {
  console.log('🔍 API Handler called - GET');
  console.log('📍 URL:', request.url);

  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    console.log('🔑 Session:', session ? 'Found' : 'Not found');
    console.log('👤 User role:', session?.user?.role);
    
    if (!session || session.user?.role !== UserRole.ADMIN) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    console.log('🔍 Query params:', { role, status, search });

    // Build where clause for filtering
    const where: any = {};
    
    if (role && role !== 'all') {
      where.role = role as UserRole;
    }
    
    if (status && status !== 'all') {
      where.status = status as string;
    }
    
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    console.log('🔍 Query filters:', where);
    
    // Fetch users with filters
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        contactPhone: true,
        role: true,
        status: true,
        verified: true,
        businessVerified: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📊 Found users:', users.length);
    return NextResponse.json(users);
    
  } catch (error) {
    console.error('💥 Error in users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Handle PATCH request - update user
export async function PATCH(request: NextRequest) {
  console.log('✏️ Processing PATCH request');

  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== UserRole.ADMIN) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, role, verified } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' }, 
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }
    
    // Build update data
    const updateData: any = {};
    
    if (status !== undefined) {
      updateData.status = status;
    }
    
    if (role !== undefined) {
      updateData.role = role;
    }
    
    if (verified !== undefined) {
      updateData.verified = verified;
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        contactPhone: true,
        role: true,
        status: true,
        verified: true,
        businessVerified: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      }
    });
    
    console.log('✅ User updated:', updatedUser.id);
    return NextResponse.json(updatedUser);
    
  } catch (error) {
    console.error('💥 Error in users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}