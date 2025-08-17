import ListingCard from "@/app/components/listings/ListingCard";
import { SafeListing } from "@/app/types";
import { notFound } from "next/navigation";

async function getListings(locationValue: string): Promise<SafeListing[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const res = await fetch(
      `${baseUrl}/api/query?address=${encodeURIComponent(locationValue)}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.error("Failed to fetch listings:", res.statusText);
      return [];
    }

    const data = await res.json();

    if (!data || !data.listings || data.listings.length === 0) {
      return [];
    }

    return data.listings as SafeListing[];
  } catch (err) {
    console.error("Error fetching listings:", err);
    return [];
  }
}

export default async function SearchPage({
  params: { locationValue },
}: {
  params: { locationValue: string };
}) {
  const listings = await getListings(locationValue);

  if (!listings || listings.length === 0) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 capitalize">
        Listings in "{locationValue.replace(/-/g, " ")}"
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <ListingCard key={listing.id} data={listing} currentUser={null} />
        ))}
      </div>
    </div>
  );
}
