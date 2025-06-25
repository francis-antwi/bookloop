import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

// Cache for frequently searched locations
const locationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Helper function to normalize address for better matching
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/[^\w\s,]/g, '') // Remove special characters except commas
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Helper function to extract location components
function extractLocationComponents(address: string) {
  const normalized = normalizeAddress(address);
  const parts = normalized.split(',').map(part => part.trim());
  
  return {
    full: normalized,
    city: parts[0] || '',
    state: parts[1] || '',
    country: parts[2] || '',
    parts: parts.filter(Boolean)
  };
}

// Helper function to check cache
function getCachedResult(key: string) {
  const cached = locationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  locationCache.delete(key);
  return null;
}

// Helper function to set cache
function setCachedResult(key: string, data: any) {
  // Limit cache size to prevent memory issues
  if (locationCache.size >= 100) {
    const firstKey = locationCache.keys().next().value;
    locationCache.delete(firstKey);
  }
  locationCache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  // Enhanced validation
  if (!address) {
    return NextResponse.json({ 
      error: "Address parameter is required",
      details: "Please provide a location to search for"
    }, { status: 400 });
  }

  if (address.length < 2) {
    return NextResponse.json({ 
      error: "Address too short",
      details: "Please provide at least 2 characters"
    }, { status: 400 });
  }

  if (address.length > 200) {
    return NextResponse.json({ 
      error: "Address too long",
      details: "Please provide a shorter location name"
    }, { status: 400 });
  }

  const normalizedAddress = normalizeAddress(address);
  const cacheKey = `search:${normalizedAddress}`;

  try {
    // Check cache first
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult, { 
        status: 200,
        headers: { 'X-Cache': 'HIT' }
      });
    }

    const locationComponents = extractLocationComponents(address);
    
    // Enhanced search strategy with multiple fallbacks
    const searchStrategies = [
      // Strategy 1: Exact match
      {
        where: {
          address: {
            equals: address,
            mode: "insensitive" as const
          }
        },
        name: 'exact'
      },
      
      // Strategy 2: Contains full normalized address
      {
        where: {
          address: {
            contains: normalizedAddress,
            mode: "insensitive" as const
          }
        },
        name: 'full_contains'
      },
      
      // Strategy 3: Contains original address
      {
        where: {
          address: {
            contains: address.trim(),
            mode: "insensitive" as const
          }
        },
        name: 'original_contains'
      },
      
      // Strategy 4: Search by city name (first part)
      ...(locationComponents.city ? [{
        where: {
          address: {
            contains: locationComponents.city,
            mode: "insensitive" as const
          }
        },
        name: 'city_match'
      }] : []),
      
      // Strategy 5: Fuzzy search using OR conditions for multiple parts
      ...(locationComponents.parts.length > 1 ? [{
        where: {
          OR: locationComponents.parts.map(part => ({
            address: {
              contains: part,
              mode: "insensitive" as const
            }
          }))
        },
        name: 'multi_part'
      }] : []),
      
      // Strategy 6: Very loose search - any word match
      {
        where: {
          OR: address.split(/\s+/).filter(word => word.length > 2).map(word => ({
            address: {
              contains: word.trim(),
              mode: "insensitive" as const
            }
          }))
        },
        name: 'word_match'
      }
    ];

    let listing = null;
    let matchType = 'none';

    // Try each search strategy until we find a match
    for (const strategy of searchStrategies) {
      try {
        listing = await prisma.listing.findFirst({
          where: strategy.where,
          select: {
            id: true,
            address: true,
            title: true,
            category: true,
            locationValue: true,
          },
          orderBy: [
            // Prioritize exact matches and recently created listings
            { createdAt: 'desc' }
          ]
        });

        if (listing) {
          matchType = strategy.name;
          break;
        }
      } catch (strategyError) {
        console.warn(`Search strategy '${strategy.name}' failed:`, strategyError);
        continue;
      }
    }

    if (listing) {
      const result = {
        success: true,
        data: {
          id: listing.id,
          address: listing.address,
          title: listing.title,
          category: listing.category,
          locationValue: listing.locationValue,
        },
        matchType,
        searchQuery: address,
        normalizedQuery: normalizedAddress
      };

      // Cache successful results
      setCachedResult(cacheKey, result);

      return NextResponse.json(result, { 
        status: 200,
        headers: { 
          'X-Cache': 'MISS',
          'X-Match-Type': matchType
        }
      });
    } else {
      // Enhanced not found response with suggestions
      const suggestions = await generateSuggestions(address);
      
      const result = {
        success: false,
        message: 'Location not found',
        searchQuery: address,
        normalizedQuery: normalizedAddress,
        suggestions,
        details: 'Try searching for a major city or popular destination nearby'
      };

      return NextResponse.json(result, { status: 404 });
    }

  } catch (error) {
    console.error("Database error during location search:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      query: address,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly error based on error type
    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        return NextResponse.json({ 
          error: 'Database connection error',
          details: 'Please try again in a moment',
          retry: true
        }, { status: 503 });
      }
      
      if (error.message.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Search timeout',
          details: 'The search took too long. Please try a shorter location name',
          retry: true
        }, { status: 408 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while searching',
      retry: true,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to generate search suggestions
async function generateSuggestions(failedQuery: string): Promise<string[]> {
  try {
    // Get popular destinations as suggestions
    const popularListings = await prisma.listing.findMany({
      select: {
        address: true,
        title: true,
      },
      take: 5,
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    const suggestions = popularListings.map(listing => {
      // Extract city name from address
      const city = listing.address.split(',')[0]?.trim();
      return city || listing.title;
    }).filter(Boolean);

    // Remove duplicates and return unique suggestions
    return [...new Set(suggestions)];
  } catch (error) {
    console.warn('Failed to generate suggestions:', error);
    return ['Kumasi', 'Accra', 'Takoradi', 'Cape Coast',]; // Fallback suggestions
  }
}

// Optional: Add a health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    // Simple database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}