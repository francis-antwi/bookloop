import getCurrentUser from "./actions/getCurrentUser";
import getListings, { IListingsParams } from "./actions/getListing";
import Client from "./components/Client";
import Container from "./components/Container";
import EmptyState from "./components/EmptyState";
import ListingCard from "./components/listings/ListingCard";
import RecommendedListings from "./components/Recommendations";
import { SafeListing } from "./types";

interface HomeProps {
  searchParams: Record<string, string | string[] | undefined>;
}

const Home = async ({ searchParams }: HomeProps) => {
  const params: IListingsParams = {
    userId: Array.isArray(searchParams.userId)
      ? searchParams.userId[0]
      : searchParams.userId,
    category: Array.isArray(searchParams.category)
      ? searchParams.category[0]
      : searchParams.category,
  };

  const listings = await getListings(params);
  const currentUser = await getCurrentUser();

  if (listings.length === 0) {
    return (
      <Client>
        <EmptyState showReset />
      </Client>
    );
  }

  return (
    <Client>
      <Container>
        {/* Render RecommendedListings outside the grid */}
     
          <RecommendedListings />
     
        
        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            md:grid-cols-3
            lg:grid-cols-4
            xl:grid-cols-5
            2xl:grid-cols-6
            gap-3
          "
        >
          {listings.map((listing: SafeListing) => (
            <ListingCard
              key={listing.id}
              data={listing}
              currentUser={currentUser}
            />
          ))}
        </div>
      </Container>
    </Client>
  );
};

export default Home;