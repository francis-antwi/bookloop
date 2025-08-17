import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/authOptions';
import prisma from '@/app/libs/prismadb';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json([], { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!currentUser) {
    return NextResponse.json([], { status: 404 });
  }

  const userId = currentUser.id;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } }
    }
  });

  const latestMessagesByUser = new Map<string, {
    withUser: { id: string; name: string; image?: string };
    lastMessage: { content: string; createdAt: string };
    unread: boolean;
  }>();

  for (const msg of messages) {
    const isSender = msg.senderId === userId;
    const otherUser = isSender ? msg.receiver : msg.sender;
    const otherUserId = otherUser.id;

    if (latestMessagesByUser.has(otherUserId)) continue;

    latestMessagesByUser.set(otherUserId, {
      withUser: {
        id: otherUser.id,
        name: otherUser.name || 'User',
        image: otherUser.image || undefined
      },
      lastMessage: {
        content: msg.content,
        createdAt: msg.createdAt.toISOString()
      },
      unread: msg.receiverId === userId && !msg.read
    });
  }

  return NextResponse.json(Array.from(latestMessagesByUser.values()));
}
