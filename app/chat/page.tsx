'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Props {
  withUserId: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  receiverId: string;
  read: boolean;
}

export default function ChatWindow({ withUserId }: Props) {
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

  const sendMessage = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await axios.post('/api/messages', { receiverId: withUserId, content });
      setContent('');
      await fetchMessages(); // Refresh chat after sending
    } catch {
      toast.error('Failed to send message');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-md mx-auto p-4 border rounded shadow">
      <div className="h-80 overflow-y-auto space-y-2 border-b mb-4 pb-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded max-w-[80%] ${
              msg.senderId === withUserId ? 'bg-gray-200 text-left' : 'bg-blue-500 text-white self-end ml-auto'
            }`}
          >
            {msg.content}
            <div className="text-xs text-right">{new Date(msg.createdAt).toLocaleTimeString()}</div>
          </div>
        ))}
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
