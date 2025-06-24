import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ response: 'OpenAI API key is missing.' }, { status: 500 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI error:", error);
      return NextResponse.json({ response: "OpenAI service unavailable." }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ response: data.choices[0].message.content });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ response: "Unexpected error occurred." }, { status: 500 });
  }
}
