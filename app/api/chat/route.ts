import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { message } = await req.json();
  const HUGGINGFACE_API_KEY = process.env.HF_API_KEY;

  if (!HUGGINGFACE_API_KEY) {
    return NextResponse.json({ response: 'Missing HuggingFace API Key.' }, { status: 500 });
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/gpt2?wait_for_model=true', // test with gpt2
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: message }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('HuggingFace error:', error, response.status);
      return NextResponse.json({ response: 'Service unavailable.' }, { status: 500 });
    }

    const data = await response.json();
    const reply = data?.[0]?.generated_text || '🤖: Sorry, I could not understand that.';

    return NextResponse.json({ response: reply });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ response: 'Unexpected server error.' }, { status: 500 });
  }
}
