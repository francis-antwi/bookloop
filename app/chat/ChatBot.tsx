'use client';
import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<string[]>(['🤖: Hi there! How can I help you with Bookloop today?']);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setMessages([...messages, `🧑: ${userMessage}`]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      setMessages((prev) => [...prev, `🤖: ${data.response}`]);
    } catch (error) {
      setMessages((prev) => [...prev, `🤖: Sorry, I'm having trouble connecting right now. Please try again.`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 right-0 z-50">
      {/* Chat Window */}
      <div className={`absolute bottom-20 right-4 transition-all duration-300 transform ${
        isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
      }`}>
        <div className="p-4 border w-[320px] rounded-lg shadow-2xl bg-white">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Bookloop Chatbot</h2>
            <button
              onClick={toggleChat}
              className="w-6 h-6 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Messages */}
          <div className="h-64 overflow-y-auto bg-gray-100 p-2 mb-2 rounded text-sm space-y-1">
            {messages.map((msg, i) => (
              <div key={i} className="break-words">
                {msg}
              </div>
            ))}
            {isLoading && (
              <div className="text-gray-500 italic">
                🤖: Typing...
              </div>
            )}
          </div>
          
          {/* Input */}
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            placeholder="Ask something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="w-full bg-blue-500 text-white py-1 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Floating Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={toggleChat}
          className={`w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 flex items-center justify-center hover:bg-blue-600 ${
            isOpen ? 'rotate-0 scale-100' : 'hover:scale-110'
          }`}
        >
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
            {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
          </div>
        </button>
        
        {/* Notification badge (optional) */}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            •
          </div>
        )}
      </div>
    </div>
  );
}