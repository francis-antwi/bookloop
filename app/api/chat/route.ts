import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { message } = await req.json();

  const HF_API_TOKEN = process.env.HF_API_TOKEN; // set this on Vercel
  if (!HF_API_TOKEN) {
    return NextResponse.json({ response: 'Hugging Face API key missing' }, { status: 500 });
  }

  const response = await fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-alpha', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: `User: ${message}\nAI:`,
    }),
  });

  const data = await response.json();

  const botReply = data?.[0]?.generated_text?.split('AI:')[1]?.trim() || 'Sorry, I couldn’t respond.';
  return NextResponse.json({ response: botReply });
}
