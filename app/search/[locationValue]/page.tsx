import ListingCard from "@/app/components/listings/ListingCard";
import { SafeListing, SafeUser } from "@/app/types";
import { notFound } from "next/navigation";

interface SearchParams {
  locationValue: string;
  category?: string;
}

async function getListings(params: SearchParams): Promise<SafeListing[]> {
  if (!process.env.NEXTAUTH_URL) {
    console.error("NEXTAUTH_URL is not defined");
    return [];
  }

  try {
    const { locationValue, category } = params;
    const query = new URLSearchParams({
      address: locationValue,
      ...(category && { category })
    }).toString();

    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/query?${query}`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!res.ok) {
      console.error('Fetch failed with status:', res.status);
      return [];
    }

    const { success, listings } = await res.json();
    
    if (!success || !Array.isArray(listings)) {
      console.error('Invalid response format');
      return [];
    }

    return listings;
  } catch (error) {
    console.error('Fetch error:', error);
    return [];
  }
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { locationValue: string };
  searchParams: { category?: string };
}) {
  const decodedLocation = decodeURIComponent(params.locationValue.replace(/-/g, " "));
  const listings = await getListings({
    locationValue: decodedLocation,
    category: searchParams.category
  });

  console.log('Search results:', { 
    location: decodedLocation,
    category: searchParams.category,
    count: listings.length 
  });

  if (listings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">
          No listings found in "{decodedLocation}"
          {searchParams.category && ` (Category: ${searchParams.category})`}
        </h1>
        <p className="text-gray-600">
          Try adjusting your search filters or check back later for new listings.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">
        {listings.length} listings in "{decodedLocation}"
        {searchParams.category && ` (Category: ${searchParams.category})`}
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