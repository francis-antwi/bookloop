import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationValue = searchParams.get('locationValue');
  const category = searchParams.get('category');

  // ✅ Softer validation: allow empty searches, just return no listings
  if (!locationValue || typeof locationValue !== 'string') {
    return NextResponse.json({
      success: true,
      listings: []
    });
  }

  try {
    const searchQuery = locationValue.toLowerCase().trim();

    const where: any = {
      status: 'APPROVED',
      OR: [
        { locationValue: { contains: searchQuery, mode: 'insensitive' } },
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } }
      ]
    };

    if (category && typeof category === 'string') {
      where.category = category;
    }

    const listings = await prisma.listing.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        locationValue: true,
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

    const safeListings = listings.map(listing => ({
      ...listing,
      createdAt: listing.createdAt.toISOString(),
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
