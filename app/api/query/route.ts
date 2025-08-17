import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationValue = searchParams.get('locationValue'); // 👈 fix here
  const category = searchParams.get('category');

  if (!locationValue || typeof locationValue !== 'string' || locationValue.length < 2 || locationValue.length > 200) {
    return NextResponse.json({
      success: false,
      message: 'Please provide a valid location between 2 and 200 characters'
    }, { status: 400 });
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
