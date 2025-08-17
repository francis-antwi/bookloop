import getCurrentUser from "../actions/getCurrentUser";  // Function to fetch the current user
import getReservations from "../actions/getReservations";  // Import getReservations function to fetch reservations
import Client from "../components/Client";
import EmptyState from "../components/EmptyState";
import Reservations from "./Bookings";

const ReservationPage = async () => {
    const currentUser = await getCurrentUser();  // Fetch current user

    // If the user is not logged in, show an empty state
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

    try {
        // Fetch reservations for the current user
        const reservations = await getReservations({
            authorId: currentUser.id  // Assuming you have a way to get reservations for a specific user
        });

        // If no reservations are found, show an empty state
        if (reservations.length === 0) {
            return (
               
                <Client>
                    <EmptyState
                        title="No bookings found"
                        subtitle="Looks like you have no bookings"
                    />
                </Client>
            );
        }

        // If reservations are found, display them
        return (
            <Client>
                <Reservations
                    reservations={reservations}  
                    currentUser={currentUser}    
                />
            </Client>
        );
    } catch (error) {
        console.error("Error fetching bookings: ", error);
        return (
            <Client>
                <EmptyState
                    title="Error"
                    subtitle="There was an error fetching your bookings."
                />
            </Client>
        );
    }
};

export default ReservationPage;
