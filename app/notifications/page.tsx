import EmptyState from "../components/EmptyState";
import getCurrentUser from "../actions/getCurrentUser";
import Client from "../components/Client";
import NotificationsContent from "./Notifications";


const Notifications = async () => {
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

  return (
    <Client>
      <NotificationsContent currentUser={currentUser} />
    </Client>
  );
};

export default Notifications;
