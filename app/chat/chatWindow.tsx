'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { pusherClient } from '../libs/pusherClient';


interface Props {
  withUserId: string;
  sessionUserId: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  sender: {
    id: string;
    name: string;
    image?: string;
  };
  receiver: {
    id: string;
    name: string;
    image?: string;
  };
}

export default function ChatWindow({ withUserId, sessionUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/messages?with=${withUserId}`);
      setMessages(res.data);
    } catch (err) {
      toast.error('Failed to load chat');
    }
  };

  const markAsRead = async () => {
    try {
      await axios.patch('/api/messages/read', { withUserId });
    } catch {
      // Optional: toast.error('Failed to mark as read');
    }
  };

  const sendMessage = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await axios.post('/api/messages', {
        receiverId: withUserId,
        content,
      });
      setContent('');
      await fetchMessages();
    } catch {
      toast.error('Failed to send message');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    markAsRead();

    const channel = pusherClient.subscribe(`chat-${sessionUserId}`);

    const handler = (data: any) => {
      if (
        data.senderId === withUserId ||
        data.receiverId === withUserId
      ) {
        fetchMessages();
        markAsRead();
      }
    };

    channel.bind('new-message', handler);

    return () => {
      channel.unbind('new-message', handler);
      pusherClient.unsubscribe(`chat-${sessionUserId}`);
    };
  }, [sessionUserId, withUserId]);

  return (
    <div className="max-w-md mx-auto p-4 border rounded shadow">
      <div className="h-80 overflow-y-auto space-y-2 border-b mb-4 pb-2 pr-2">
        {messages.map((msg) => {
          const isSender = msg.senderId === sessionUserId;
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${
                isSender ? 'justify-end' : 'justify-start'
              }`}
            >
              {!isSender && msg.sender.image && (
                <img
                  src={msg.sender.image}
                  alt={msg.sender.name}
                  className="w-8 h-8 rounded-full"
                />
              )}

              <div
                className={`p-2 rounded max-w-[80%] ${
                  isSender
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-black'
                }`}
              >
                {!isSender && (
                  <div className="text-xs font-semibold mb-1">
                    {msg.sender.name}
                  </div>
                )}
                <div>{msg.content}</div>
                <div className="text-[10px] text-right opacity-70">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
              </div>

              {isSender && msg.sender.image && (
                <img
                  src={msg.sender.image}
                  alt="You"
                  className="w-8 h-8 rounded-full"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 p-2 border rounded"
          placeholder="Type your message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
