import EmptyState from "../components/EmptyState";
import getCurrentUser from "../actions/getCurrentUser";
import PropertiesClient from "./PropertiesClient";
import Client from "../components/Client";
import getListings from "../actions/getListing";

const Properties = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return (
            <Client>
                <EmptyState
                    title="Unauthorized"
                    subtitle="Please login"
                />
            </Client>
        );
    }
    
    const listings = await getListings({
        userId: currentUser.id
    });
    
    if (listings.length === 0) {
        return (
            <Client>
                <EmptyState
                    title="No listings found"
                    subtitle="Looks like you have no listings"
                />
            </Client>
        );
    }

    return (
        <Client>
            <PropertiesClient
                listings={listings}
                currentUser={currentUser}
            />
        </Client>
    );
};

export default Properties;
