import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const category = searchParams.get('category');

  // Validate input
  if (!address || typeof address !== 'string' || address.length < 2 || address.length > 200) {
    return NextResponse.json({
      success: false,
      message: 'Please provide a valid location between 2 and 200 characters'
    }, { status: 400 });
  }

  try {
    // Simple normalization - be careful with complex regex that might fail
    const searchQuery = address.toLowerCase().trim();

    // Build the where clause safely
    const where: any = {
      status: 'APPROVED',
      OR: [
        { address: { contains: searchQuery, mode: 'insensitive' } },
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } }
      ]
    };

    // Add category filter if provided
    if (category && typeof category === 'string') {
      where.category = category;
    }

    // Get listings with error handling
    const listings = await prisma.listing.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        address: true,
        category: true,
        imageSrc: true,
        price: true,
        userId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            verified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Transform data safely
    const safeListings = listings.map(listing => ({
      ...listing,
      createdAt: listing.createdAt.toISOString(),
      // Handle possible null/undefined imageSrc
      imageSrc: Array.isArray(listing.imageSrc) ? listing.imageSrc : [],
      user: listing.user || null
    }));

    return NextResponse.json({
      success: true,
      listings: safeListings
    });

  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to search listings'
    }, { status: 500 });
  }
}