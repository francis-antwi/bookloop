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
    select: { id: true, name: true, image: true },
  });

  if (!sender) {
    return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
  }

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, name: true, image: true },
  });

  if (!receiver) {
    return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      senderId: sender.id,
      receiverId,
      content,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      senderId: true,
      receiverId: true,
      read: true,
    },
  });

  const fullMessage = {
    ...message,
    sender,
    receiver,
  };

  // Send to receiver's chat channel
  await pusherServer.trigger(`chat-${receiverId}`, 'new-message', fullMessage);

  // Also notify sender for real-time sync
  await pusherServer.trigger(`chat-${sender.id}`, 'new-message', fullMessage);

  // Global bell/toast notification
  await pusherServer.trigger('global-messages', 'new-message', {
    senderId: sender.id,
    senderName: sender.name,
    receiverId,
    content,
  });

  return NextResponse.json(fullMessage);
}
