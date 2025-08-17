import ListingCard from "@/app/components/listings/ListingCard";
import { SafeListing } from "@/app/types";
import { notFound } from "next/navigation";

async function getListings(locationValue: string): Promise<SafeListing[]> {
  try {
    const encodedLocation = encodeURIComponent(locationValue);
    const apiUrl = `${process.env.NEXTAUTH_URL}/api/query?address=${encodedLocation}`;
    
    if (!process.env.NEXTAUTH_URL) {
      console.error("NEXTAUTH_URL is not defined");
      return [];
    }

    const res = await fetch(apiUrl, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`API request failed with status ${res.status}`);
      return [];
    }

    const data = await res.json();

    if (!data?.success || !Array.isArray(data.listings)) {
      console.error("Invalid API response structure");
      return [];
    }

    return data.listings;
  } catch (error) {
    console.error("Failed to fetch listings:", error);
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