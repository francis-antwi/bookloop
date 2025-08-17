import ListingCard from "@/app/components/listings/ListingCard";
import { SafeListing } from "@/app/types";
import prisma from "@/app/libs/prismadb";
import { notFound } from "next/navigation";

// Helper function to generate location value (consistent with your API)
function generateLocationValue(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

// Direct database access version (recommended)
async function getListingsDirect(locationValue: string): Promise<SafeListing[]> {
  try {
    const normalizedAddress = locationValue.replace(/-/g, " ");
    
    const listings = await prisma.listing.findMany({
      where: {
        OR: [
          { address: { contains: normalizedAddress, mode: 'insensitive' } },
          { 
            address: { 
              contains: normalizedAddress.split(' ')[0], // First word only
              mode: 'insensitive' 
            } 
          }
        ]
      },
      select: {
        id: true,
        title: true,
        address: true,
        category: true,
        imageSrc: true,
        price: true,
        availableDates: true
      },
      orderBy: { createdAt: 'desc' },
      take: 12
    });

    return listings.map(listing => ({
      ...listing,
      locationValue: generateLocationValue(listing.address)
    }));
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

// API fetch version (alternative)
async function getListingsViaAPI(locationValue: string): Promise<SafeListing[]> {
  try {
    // Use relative URL for client components, absolute for server
    const url = process.env.NODE_ENV === 'production'
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/search?address=${locationValue}`
      : `/api/search?address=${locationValue}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();
    return data.success ? data.listings : [];
  } catch (error) {
    console.error('Fetch error:', error);
    return [];
  }
}

export default async function SearchPage({
  params: { locationValue }
}: {
  params: { locationValue: string };
}) {
  // Choose one approach:
  // const listings = await getListingsViaAPI(locationValue);
  const listings = await getListingsDirect(locationValue);

  if (!listings || listings.length === 0) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 capitalize">
        Listings in "{locationValue.replace(/-/g, " ")}"
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            data={listing}
            currentUser={null}
          />
        ))}
      </div>
    </div>
  );
}