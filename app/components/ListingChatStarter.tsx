// ✅ components/ListingChatStarter.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

interface ListingChatStarterProps {
  providerId: string;
  listingTitle: string;
}

export default function ListingChatStarter({ providerId, listingTitle }: ListingChatStarterProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartChat = async () => {
    if (!session?.user) {
      toast.error('You must be signed in');
      return;
    }

    if (session.user.id === providerId) {
      toast.error("You can't chat with yourself");
      return;
    }

    setLoading(true);
    router.push(`/chat/${providerId}`);
  };

  return (
    <button
      onClick={handleStartChat}
      disabled={loading}
      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Message Provider about "{listingTitle}"
    </button>
  );
}
