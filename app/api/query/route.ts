import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache
const locationCache = new Map<string, { data: any; timestamp: number }>();

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/[^\w\s,]/g, '')
    .replace(/\s+/g, ' ');
}

function getCachedResult(key: string) {
  const cached = locationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  locationCache.delete(key);
  return null;
}

function setCachedResult(key: string, data: any) {
  if (locationCache.size >= 100) {
    const firstKey = locationCache.keys().next().value;
    locationCache.delete(firstKey);
  }
  locationCache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const category = searchParams.get('category');

  if (!address || address.length < 2 || address.length > 200) {
    return NextResponse.json({
      success: false,
      message: 'Please provide a location between 2 and 200 characters'
    }, { status: 400 });
  }

  try {
    const normalizedAddress = normalizeAddress(address);
    const cacheKey = `search:${normalizedAddress}:${category || 'all'}`;
    
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        listings: cached,
        cached: true
      });
    }

    const whereClause: any = {
      AND: [
        { address: { not: null } },
        { 
          OR: [
            { address: { contains: normalizedAddress, mode: 'insensitive' } },
            { title: { contains: normalizedAddress, mode: 'insensitive' } },
            { description: { contains: normalizedAddress, mode: 'insensitive' } }
          ]
        },
        { status: 'APPROVED' } // Only show approved listings
      ]
    };

    if (category) {
      whereClause.AND.push({ category });
    }

    const listings = await prisma.listing.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        description: true,
        address: true,
        category: true,
        imageSrc: true,
        price: true,
        availableDates: true,
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

    const responseData = listings.map(listing => ({
      ...listing,
      createdAt: listing.createdAt.toISOString(),
      availableDates: listing.availableDates ? JSON.parse(listing.availableDates) : [],
      user: listing.user
    }));

    setCachedResult(cacheKey, responseData);

    return NextResponse.json({
      success: true,
      listings: responseData
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}