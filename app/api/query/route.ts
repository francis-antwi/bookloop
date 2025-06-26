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
    parts: parts.filter(Boolean)
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
      { address: { contains: normalizedAddress, mode: 'insensitive' } },
      ...locationComponents.parts.map(part => ({
        address: { contains: part, mode: 'insensitive' }
      })),
      ...address.split(/\s+/).filter(w => w.length > 2).map(word => ({
        address: { contains: word, mode: 'insensitive' }
      }))
    ];

    const listings = await prisma.listing.findMany({
      where: {
        AND: [{ address: { not: null } }], // ✅ prevent null crash
        OR: orConditions
      },
      select: {
        address: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 10
    });

    if (listings.length > 0) {
      const result = {
        success: true,
        matchCount: listings.length,
        listings,
        searchQuery: address,
        normalizedQuery: normalizedAddress
      };
      setCachedResult(cacheKey, result);

      return NextResponse.json(result, {
        status: 200,
        headers: { 'X-Cache': 'MISS' }
      });
    }

    const suggestions = await generateSuggestions(address);
    return NextResponse.json({
      success: false,
      message: 'No listings found for this location',
      listings: [],
      searchQuery: address,
      normalizedQuery: normalizedAddress,
      suggestions
    }, { status: 404 }); // 👈 more accurate than 200
  } catch (error: any) {
    console.error('Search failed:', error);
    return NextResponse.json({
      error: 'Search failed',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
