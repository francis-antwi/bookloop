import getCurrentUser from "./actions/getCurrentUser";
import getListings, { IListingsParams } from "./actions/getListing";
import Client from "./components/Client";
import Container from "./components/Container";
import EmptyState from "./components/EmptyState";
import ListingCard from "./components/listings/ListingCard";
import { SafeListing } from "./types";

interface HomeProps {
  // Accept searchParams as a Promise resolving to flexible key-value pairs
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const Home = async ({ searchParams }: HomeProps) => {
  // Await the raw search params
  const rawParams = await searchParams;

  // Normalize rawParams to IListingsParams expected by getListings
  const params: IListingsParams = {
    userId: Array.isArray(rawParams.userId) ? rawParams.userId[0] : rawParams.userId,
    category: Array.isArray(rawParams.category) ? rawParams.category[0] : rawParams.category,
  };

  // Fetch listings and current user
  const listings = await getListings(params);
  const currentUser = await getCurrentUser();

  // Render empty state if no listings found
  if (listings.length === 0) {
    return (
      <Client>
        <EmptyState showReset />
      </Client>
    );
  }

  // Render listings grid
  return (
    <Client>
      <Container>
        <div
          className="
            pt-24
            grid
            grid-cols-1
            sm:grid-cols-2
            md:grid-cols-3
            lg:grid-cols-4
            xl:grid-cols-5
            2xl:grid-cols-6
            gap-9
          "
        >
          {listings.map((listing: SafeListing) => (
            <ListingCard
              currentUser={currentUser}
              key={listing.id}
              data={listing}
            />
          ))}
        </div>
      </Container>
    </Client>
  );
};

export default Home;
