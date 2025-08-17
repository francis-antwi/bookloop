'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { pusherClient } from '../libs/pusherClient';
import debounce from 'lodash.debounce';

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
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    messagesTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      const isNearTop = scrollTop <= 100;
      
      // Show scroll buttons if not at the very top or bottom and there's enough content
      setShowScrollButtons(scrollHeight > clientHeight && !isNearTop && !isNearBottom);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/messages?with=${withUserId}`);
      setMessages(res.data);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Fetch messages failed:', err);
      toast.error('Failed to load chat');
    }
  };

  const markAsRead = async () => {
    try {
      await axios.patch('/api/messages/read', { withUserId });
    } catch {
      // Optionally show toast
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
      stopTyping(); // stop typing after sending
    } catch (err) {
      console.error('Send message failed:', err);
      toast.error('Failed to send message');
      setLoading(false);
      return;
    }

    try {
      await fetchMessages();
    } catch {
      toast.error('Message sent, but chat failed to refresh');
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const emitTyping = debounce(() => {
    pusherClient.trigger(`chat-${withUserId}`, 'typing', {
      from: sessionUserId,
      to: withUserId,
    });
  }, 300);

  const stopTyping = debounce(() => {
    pusherClient.trigger(`chat-${withUserId}`, 'stop-typing', {
      from: sessionUserId,
      to: withUserId,
    });
  }, 1000);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    emitTyping();
    stopTyping();
  };

  useEffect(() => {
    fetchMessages();
    markAsRead();

    const channel = pusherClient.subscribe(`chat-${sessionUserId}`);

    const messageHandler = (data: any) => {
      if (
        data.senderId === withUserId ||
        data.receiverId === withUserId
      ) {
        fetchMessages();
        markAsRead();
      }
    };

    const typingHandler = (data: any) => {
      if (data.from === withUserId) {
        setIsTyping(true);
      }
    };

    const stopTypingHandler = (data: any) => {
      if (data.from === withUserId) {
        setIsTyping(false);
      }
    };

    channel.bind('new-message', messageHandler);
    channel.bind('typing', typingHandler);
    channel.bind('stop-typing', stopTypingHandler);

    return () => {
      channel.unbind('new-message', messageHandler);
      channel.unbind('typing', typingHandler);
      channel.unbind('stop-typing', stopTypingHandler);
      pusherClient.unsubscribe(`chat-${sessionUserId}`);
    };
  }, [sessionUserId, withUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white relative">
      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      >
        <div ref={messagesTopRef} />
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSender = msg.senderId === sessionUserId;
            const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}
              >
                {!isSender && showAvatar && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {msg.sender.image ? (
                      <img
                        src={msg.sender.image}
                        alt={msg.sender.name}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {msg.sender.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                <div className={`relative max-w-[70%] ${isSender ? 'order-1' : 'order-2'}`}>
                  {!isSender && showAvatar && (
                    <div className="text-xs text-gray-500 mb-1 ml-3">{msg.sender.name}</div>
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl shadow-sm ${
                      isSender
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <div className="break-words">{msg.content}</div>
                    <div className={`text-xs mt-1 ${isSender ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>

                {isSender && showAvatar && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {msg.sender.image ? (
                      <img
                        src={msg.sender.image}
                        alt="You"
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        You
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-gray-500 px-4 italic">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300" />
            <span>Typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll Control Buttons */}
      {showScrollButtons && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-10">
          <button
            onClick={scrollToTop}
            className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
            title="Scroll to top"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={scrollToBottom}
            className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
            title="Scroll to bottom"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-gray-50 px-4 py-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              className="w-full px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
              placeholder="Type your message..."
              value={content}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={loading || !content.trim()}
            className={`p-3 rounded-full transition-all duration-200 shadow-sm ${
              loading || !content.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg transform hover:scale-105'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}