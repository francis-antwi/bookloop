'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2 } from 'lucide-react';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [messages, setMessages] = useState<string[]>([
    '🤖: Hi there! How can I help you with Bookloop Services today?'
  ]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
  };

  const minimizeChat = () => {
    setIsMinimized((prev) => !prev);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages((prev) => [...prev, `🧑: ${userMessage}`]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, `🤖: ${data.response}`]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        `🤖: Sorry, I’m having trouble right now. Try again soon.`,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) handleSend();
  };

  const formatMessage = (msg: string, index: number) => {
    const isBot = msg.startsWith('🤖:');
    const isUser = msg.startsWith('🧑:');
    const text = msg.substring(3).trim();

    return (
      <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
            isUser ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-gray-500 to-gray-600'
          }`}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md' 
              : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
          }`}>
            <p className="text-sm leading-relaxed">{text}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 right-0 z-50">
      {/* Chat Window */}
      <div className={`absolute bottom-20 right-4 transition-all duration-500 ease-out transform ${
        isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8 pointer-events-none'
      }`}>
        <div className={`bg-white rounded-2xl shadow-2xl border border-gray-100 transition-all duration-300 ${
          isMinimized ? 'w-[320px] h-14' : 'w-[380px] h-[500px]'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">EliteFields Assistant</h3>
                  <div className="flex items-center gap-2 text-xs opacity-90">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Online • Ready to help</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={minimizeChat} className="w-8 h-8 hover:bg-white hover:bg-opacity-20 rounded-full flex items-center justify-center transition-all duration-200">
                  <Minimize2 size={16} />
                </button>
                <button onClick={toggleChat} className="w-8 h-8 hover:bg-white hover:bg-opacity-20 rounded-full flex items-center justify-center transition-all duration-200">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Body */}
          {!isMinimized && (
            <>
              <div className="h-80 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
                {messages.map((msg, i) => formatMessage(msg, i))}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white flex items-center justify-center">
                        <Bot size={16} />
                      </div>
                      <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Button */}
      <div className="fixed bottom-6 right-6">
        <div className="relative">
          <button
            onClick={toggleChat}
            className="w-16 h-16 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center hover:scale-110"
          >
            <div className={`transition-all duration-300 ${isOpen ? 'rotate-180 scale-90' : 'rotate-0 scale-100'}`}>
              {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </div>
          </button>

          {/* Ripple Effect */}
          {!isOpen && (
            <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-ping opacity-20"></div>
          )}

          {/* Notification Dot */}
          {!isOpen && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
