import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { SafeUser } from "../types";
import useLoginModal from "./useLoginModal";

interface IUseFavorite {
    listingId: string;
    currentUser?: SafeUser | null;
}

const useFavorite = ({
    listingId,
    currentUser
}: IUseFavorite) => {
    const router = useRouter();
    const loginModal = useLoginModal();

    const hasFavorited = useMemo(() => {
        const list = currentUser?.favouriteIds || [];
        return list.includes(listingId);
    }, [currentUser, listingId]);

const toggleFavorite = useCallback(async (e?: React.MouseEvent<HTMLDivElement>) => {
  e?.stopPropagation();

  if (!currentUser) {
    return loginModal.onOpen();
  }

  try {
    let request;
    if (hasFavorited) {
      request = () => axios.delete(`/api/favourites/${listingId}`);
    } else {
      request = () => axios.post(`/api/favourites/${listingId}`);
    }

    await request();
    router.refresh();
    toast.success(hasFavorited ? 'Removed from favorites' : 'Added to favorites');
  } catch (error) {
    console.error("Error during favorite toggle:", error);
    toast.error('Something went wrong');
  }
}, [currentUser, hasFavorited, listingId, loginModal, router]);

    return {
        hasFavorited,
        toggleFavorite
    }
};

export default useFavorite;
