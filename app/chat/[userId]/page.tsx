'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { pusherClient } from '@/app/libs/pusherClient';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

interface ChatPreview {
  user: {
    id: string;
    name: string;
    image?: string;
  };
  lastMessage: string;
  unreadCount: number;
}

export default function ChatInbox() {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchChats = async () => {
    const res = await axios.get('/api/messages/inbox');
    setChats(res.data);

    const unread = res.data.reduce(
      (acc: number, chat: ChatPreview) => acc + chat.unreadCount,
      0
    );
    setTotalUnread(unread);
  };

  useEffect(() => {
    fetchChats();

    const channel = pusherClient.subscribe('global-messages');

    const handler = (data: any) => {
      toast.success(`📩 New message from ${data.senderName}`);
      fetchChats(); // Refresh inbox
    };

    channel.bind('new-message', handler);

    return () => {
      channel.unbind('new-message', handler);
      pusherClient.unsubscribe('global-messages');
    };
  }, []);

  return (
    <div className="max-w-md mx-auto mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Inbox</h2>
        <div className="relative">
          <Bell className="w-6 h-6 text-gray-600" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
      </div>

      {chats.map((chat) => (
        <Link href={`/messages/${chat.user.id}`} key={chat.user.id}>
          <div className="flex items-center gap-3 p-3 border-b hover:bg-gray-100 cursor-pointer">
            {chat.user.image && (
              <img
                src={chat.user.image}
                alt={chat.user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <div className="font-semibold">{chat.user.name}</div>
              <div className="text-sm text-gray-600 truncate">
                {chat.lastMessage}
              </div>
            </div>
            {chat.unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                {chat.unreadCount}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
