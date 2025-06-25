import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

const locationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/[^\w\s,]/g, '') // remove special characters
    .replace(/\s+/g, ' ');    // normalize whitespace
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

  if (!address || address.length < 2 || address.length > 200) {
    return NextResponse.json({
      error: 'Invalid address input',
      details: 'Please provide a location between 2 and 200 characters'
    }, { status: 400 });
  }

  try {
    const normalizedAddress = normalizeAddress(address);
    const cacheKey = `strict-match:${normalizedAddress}`;

    const cached = getCachedResult(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { 'X-Cache': 'HIT' },
      });
    }

    const listings = await prisma.listing.findMany({
      where: {
        address: {
          equals: normalizedAddress,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
        address: true,
        category: true,
      },
      take: 1, // ⬅️ if you're expecting only one listing per address
    });

    if (listings.length > 0) {
      const result = {
        success: true,
        listing: listings[0], // ⬅️ only return the single matched listing
        searchQuery: address,
        normalizedQuery: normalizedAddress,
      };
      setCachedResult(cacheKey, result);

      return NextResponse.json(result, {
        status: 200,
        headers: { 'X-Cache': 'MISS' },
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No listing found with that exact address',
      listing: null,
      searchQuery: address,
      normalizedQuery: normalizedAddress,
    }, { status: 404 });

  } catch (error: any) {
    console.error('Search failed:', error);
    return NextResponse.json({
      error: 'Search failed',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
