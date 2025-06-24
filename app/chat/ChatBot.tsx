'use client';
import { useState } from 'react';

export default function Chatbot() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    const userMessage = input;
    setMessages([...messages, `🧑: ${userMessage}`]);
    setInput('');

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    setMessages((prev) => [...prev, `🤖: ${data.response}`]);
  };

  return (
    <div className="p-4 border w-[300px] rounded shadow">
      <h2 className="font-bold mb-2">Bookloop Chatbot</h2>
      <div className="h-64 overflow-y-auto bg-gray-100 p-2 mb-2 rounded text-sm">
        {messages.map((msg, i) => <div key={i}>{msg}</div>)}
      </div>
      <input
        className="border rounded w-full px-2 py-1"
        placeholder="Ask something..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        className="mt-2 w-full bg-blue-500 text-white py-1 rounded"
        onClick={handleSend}
      >
        Send
      </button>
    </div>
  );
}
