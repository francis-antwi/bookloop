import ListingCard from "@/app/components/listings/ListingCard";
import { SafeListing } from "@/app/types";
import { notFound } from "next/navigation";

async function getListings(locationValue: string): Promise<SafeListing[]> {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/query?address=${encodeURIComponent(locationValue)}`,
      { cache: 'no-store' }
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

export default async function SearchPage(props: {
  params: { locationValue: string };
}) {
  const { locationValue } = props.params;
  const decodedLocation = locationValue.replace(/-/g, " ");

  const listings = await getListings(locationValue);

  if (listings.length === 0) {
    // Consider showing an empty state instead of 404
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6 capitalize">
          No listings found in "{decodedLocation}"
        </h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 capitalize">
        Listings in "{decodedLocation}"
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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