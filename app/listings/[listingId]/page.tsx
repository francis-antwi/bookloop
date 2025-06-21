import getListingById from "@/app/actions/getListingById";
import Client from "@/app/components/Client";
import EmptyState from "@/app/components/EmptyState";
import ListingClient from "./ListingClient";
import getCurrentUser from "@/app/actions/getCurrentUser";

interface IParams {
    listingId?: string;
}

const ListingPage = async ({ params }: { params: IParams }) => {
    if (!params.listingId) {
        return <div>Listing ID is missing</div>;
    }

    const listing = await getListingById({ listingId: params.listingId }); // Pass as an object
    const currentUser = await getCurrentUser();  
    if (!listing) {
        return (<Client>
            <EmptyState/>
           </Client>
           );
    }

    return (
        <Client>
             <ListingClient
             listing={listing}
             currentUser={currentUser}

             />
        </Client>
       
  
    );
};

export default ListingPage;
