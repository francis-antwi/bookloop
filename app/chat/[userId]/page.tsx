import ReviewForm from "@/app/components/inputs/ReviewForm";
interface ListingInfoProps {
  listing?: {
    id?: string;
    title?: string;
    description?: string;
    price?: number;
    category?: string;
    address?: string;
    contactPhone?: string;
    email?: string;
    user?: {
      id: string;
      name?: string;
      image?: string;
    };

  };
}

const ListingInfo: React.FC<ListingInfoProps> = ({ listing }) => {
  // ...

  if (!listing) return null;

  return (
    <>

      <div className="mt-6">
        {listing.id && <ReviewForm listingId={listing.id} />}
      </div>
    </>
  );
};
