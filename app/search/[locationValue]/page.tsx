import ListingCard from "@/app/components/listings/ListingCard";
import { notFound } from "next/navigation";

interface SearchParams {
  locationValue: string;
  category?: string;
}

async function getListings(params: SearchParams) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const query = new URLSearchParams({
      locationValue: decodeURIComponent(params.locationValue.replace(/-/g, " ")), // 👈 fix here
      ...(params.category && { category: params.category })
    }).toString();

    const response = await fetch(`${baseUrl}/api/query?${query}`, {
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.success ? data.listings : [];

  } catch (error) {
    console.error('Failed to fetch listings:', error);
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
  const location = decodeURIComponent(params.locationValue.replace(/-/g, " "));
  const listings = await getListings({
    locationValue: params.locationValue,
    category: searchParams.category
  });

  console.log('Search results for:', location, {
    category: searchParams.category,
    found: listings.length
  });

  if (listings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">
          No listings found in "{location}"
          {searchParams.category && ` (${searchParams.category})`}
        </h1>
        <div className="text-gray-600 space-y-2">
          <p>Try these suggestions:</p>
          <ul className="list-disc pl-5">
            <li>Check your spelling</li>
            <li>Try more general terms</li>
            <li>Search in nearby locations</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">
        {listings.length} {listings.length === 1 ? 'listing' : 'listings'} in "{location}"
        {searchParams.category && ` (${searchParams.category})`}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {listings.map((listing: any) => (
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