
import EmptyState from "../components/EmptyState";

import getCurrentUser from "../actions/getCurrentUser";
import getFavouriteListings from "../actions/getFavouriteListing";
import Favourites from "./Favourites";
import Client from "../components/Client";


const ListingPage = async () => {
    const listings = await getFavouriteListings();
    const currentUser = await getCurrentUser();
    if(listings.length ===0){
        return (
            <Client>
                <EmptyState
                    title="No favourites found"
                    subtitle="Looks like you have no favourite listings"
                />
            </Client>
        );
    }
    return(
        <Client>
            <Favourites
            listings={listings}
            currentUser={currentUser}
            />
        </Client>
    )
    }
    

export default ListingPage;
