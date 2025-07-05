'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface InboxEntry {
  withUser: {
    id: string;
    name: string;
    image?: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
  };
  unread: boolean;
}

export default function Inbox() {
  const [conversations, setConversations] = useState<InboxEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    axios.get('/api/inbox')
      .then((res) => setConversations(res.data))
      .catch(() => console.error('Failed to load inbox'));
  }, []);

  const formatTime = (date: string) => new Date(date).toLocaleString();

  return (
    <div className="space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">Inbox</h1>
      {conversations.length === 0 ? (
        <p className="text-gray-500">No conversations yet.</p>
      ) : (
        conversations.map(({ withUser, lastMessage, unread }) => (
          <div
            key={withUser.id}
            onClick={() => router.push(`/messages/${withUser.id}`)}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {withUser.image ? (
                <img
                  src={withUser.image}
                  className="w-10 h-10 rounded-full object-cover"
                  alt={withUser.name}
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-medium">
                  {withUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium">{withUser.name}</p>
                <p className="text-sm text-gray-600 truncate max-w-[200px]">{lastMessage.content}</p>
              </div>
            </div>
            <div className="text-sm text-gray-400 text-right">
              <p>{formatTime(lastMessage.createdAt)}</p>
              {unread && (
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-1" />
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
