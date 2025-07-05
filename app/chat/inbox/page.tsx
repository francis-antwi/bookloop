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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    axios.get('/api/messages/inbox')
      .then((res) => {
        setConversations(res.data);
        setLoading(false);
      })
      .catch(() => {
        console.error('Failed to load inbox');
        setLoading(false);
      });
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 7 * 24) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />
            <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl animate-pulse">
                <div className="w-14 h-14 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
                <div className="text-right space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-12" />
                  <div className="h-2 bg-gray-200 rounded-full w-2 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-500 text-sm mt-1">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm">
              Start a conversation with someone to see your messages here.
            </p>
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg">
              Start New Chat
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map(({ withUser, lastMessage, unread }) => (
              <div
                key={withUser.id}
                onClick={() => router.push(`/chat/${withUser.id}`)}
                className={`group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 cursor-pointer hover:shadow-md hover:bg-gray-50 ${
                  unread ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-white border border-gray-100'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {withUser.image ? (
                    <img
                      src={withUser.image}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      alt={withUser.name}
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                      {withUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Online indicator (optional) */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold truncate ${unread ? 'text-gray-900' : 'text-gray-800'}`}>
                      {withUser.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${unread ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                        {formatTime(lastMessage.createdAt)}
                      </span>
                      {unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  </div>
                  <p className={`text-sm truncate ${unread ? 'text-gray-700 font-medium' : 'text-gray-600'}`}>
                    {lastMessage.content}
                  </p>
                </div>

                {/* Hover arrow */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Unread badge */}
                {unread && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}