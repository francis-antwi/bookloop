'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2 } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<string[]>([
    '🤖: Hi there! How can I help you with Bookloop Services today?',
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
  };

  const minimizeChat = () => {
    setIsMinimized((prev) => !prev);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();

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
      setMessages((prev) => [...prev, '🤖: Sorry, I’m having trouble right now. Try again soon.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  const renderMessage = (msg: string, index: number) => {
    const isUser = msg.startsWith('🧑:');
    const text = msg.slice(3).trim();

    return (
      <div
        key={index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}
      >
        <div
          className={`px-4 py-2 text-sm max-w-[75%] rounded-xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
          }`}
        >
          {text}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleChat}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform duration-300"
        >
          {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[370px] max-w-[95vw] z-50 bg-white border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <div className="bg-white bg-opacity-20 p-1 rounded-full">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold">Bookloop Assistant</p>
                <p className="text-xs text-white/80">Online • Ready to help</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={minimizeChat} aria-label="Minimize chat">
                <Minimize2 size={16} />
              </button>
              <button onClick={toggleChat} aria-label="Close chat">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <div className="h-80 overflow-y-auto px-4 py-3 bg-gray-50">
              {messages.map((msg, idx) => renderMessage(msg, idx))}
              {isLoading && (
                <div className="flex gap-2 px-2 py-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          {!isMinimized && (
            <div className="flex items-center gap-2 px-4 py-3 border-t bg-white">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 text-sm border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
