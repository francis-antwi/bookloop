import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/authOptions';
import prisma from '@/app/libs/prismadb';
import { pusherServer } from '@/app/libs/pusher';


export async function POST(req: NextRequest) {
  const session = await getServerSession({ req, ...authOptions });
  const body = await req.json();
  const { receiverId, content } = body;

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sender = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!sender) {
    return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      senderId: sender.id,
      receiverId,
      content,
    },
  });

  // Broadcast real-time event
  await pusherServer.trigger(`chat-${receiverId}`, 'new-message', {
    ...message,
    senderId: sender.id,
    senderName: sender.name,
  });

  await pusherServer.trigger('global-messages', 'new-message', {
    senderId: sender.id,
    senderName: sender.name,
    receiverId,
    content,
  });

  return NextResponse.json(message);
}
