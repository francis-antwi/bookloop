import { NextApiRequest, NextApiResponse } from 'next';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const message = req.body?.message;

  if (message?.text) {
    const chatId = message.chat.id;
    const userMessage = message.text;

    // Simple echo or command response
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `You said: ${userMessage}`,
      }),
    });
  }

  return res.status(200).json({ status: 'ok' });
}
