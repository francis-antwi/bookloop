'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface Conversation {
  user: {
    id: string;
    name: string;
    image?: string;
  };
  lastMessage: string;
  timestamp: string;
}

export default function InboxList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    axios.get('/api/conversations').then((res) => {
      setConversations(res.data);
    });
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold mb-4">Inbox</h3>
      {conversations.map((c) => (
        <Link href={`/chat/${c.user.id}`} key={c.user.id}>
          <div className="flex items-center gap-3 p-3 border rounded hover:bg-gray-100 cursor-pointer">
            {c.user.image && (
              <img
                src={c.user.image}
                alt={c.user.name}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="flex-1">
              <div className="font-semibold">{c.user.name}</div>
              <div className="text-sm text-gray-500 truncate">{c.lastMessage}</div>
            </div>
            <div className="text-xs text-gray-400">
              {new Date(c.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
