import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/authOptions';
import prisma from '@/app/libs/prismadb';

export async function GET(req: NextRequest) {
  const session = await getServerSession({ req, ...authOptions });

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Find unique users you've chatted with
  const rawMessages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUser.id },
        { receiverId: currentUser.id },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      sender: true,
      receiver: true,
    },
  });

  const seen = new Set<string>();
  const inbox: any[] = [];

  for (const msg of rawMessages) {
    const otherUser =
      msg.senderId === currentUser.id ? msg.receiver : msg.sender;
    if (seen.has(otherUser.id)) continue;

    const unreadCount = await prisma.message.count({
      where: {
        senderId: otherUser.id,
        receiverId: currentUser.id,
        read: false,
      },
    });

    inbox.push({
      user: {
        id: otherUser.id,
        name: otherUser.name,
        image: otherUser.image,
      },
      lastMessage: msg.content,
      unreadCount,
    });

    seen.add(otherUser.id);
  }

  return NextResponse.json(inbox);
}
