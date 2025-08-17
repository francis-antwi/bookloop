import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

const locationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/[^\w\s,]/g, '')
    .replace(/\s+/g, ' ');
}

function extractLocationComponents(address: string) {
  const normalized = normalizeAddress(address);
  const parts = normalized.split(',').map(part => part.trim());
  return {
    full: normalized,
    city: parts[0] || '',
    parts: parts.filter(p => p.length > 3)
  };
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

function generateLocationValue(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address || address.length < 2 || address.length > 200) {
    return NextResponse.json({
      success: false,
      details: 'Please provide a location between 2 and 200 characters'
    }, { status: 400 });
  }

  try {
    const normalizedAddress = normalizeAddress(address);
    const cacheKey = `search:${normalizedAddress}`;
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { 'X-Cache': 'HIT' }
      });
    }

    const locationComponents = extractLocationComponents(address);

    const orConditions = [
      { address: { equals: normalizedAddress, mode: 'insensitive' } },
      { address: { contains: normalizedAddress, mode: 'insensitive' } },
      ...locationComponents.parts.map(part => ({
        address: { contains: part, mode: 'insensitive' }
      }))
    ];

    const listings = await prisma.listing.findMany({
      where: {
        AND: [
          { address: { not: null } },
          { OR: orConditions }
        ]
      },
      select: {
        id: true,
        title: true,
        address: true,
        category: true,
        imageSrc: true,         // ✅ Required by ListingCard
        price: true,            // ✅ Required by ListingCard
        availableDates: true    // ✅ Optional but used in some views
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const transformedListings = listings.map(listing => ({
      ...listing,
      locationValue: generateLocationValue(listing.address)
    }));

    const result = {
      success: true,
      listings: transformedListings,
      searchQuery: address,
      normalizedQuery: normalizedAddress
    };

    setCachedResult(cacheKey, result);

    return NextResponse.json(result, {
      status: 200,
      headers: { 'X-Cache': listings.length > 0 ? 'MISS' : 'MISS' }
    });

  } catch (error: any) {
    console.error('Search failed:', error);
    return NextResponse.json({
      success: false,
      details: error.message || 'An unexpected error occurred while searching'
    }, { status: 500 });
  }
}