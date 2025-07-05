import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/authOptions';
import prisma from '@/app/libs/prismadb';
import { pusherServer } from '@/app/libs/pusher';

// POST: Send a new message
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

  await pusherServer.trigger(`chat-${receiverId}`, 'new-message', fullMessage);
  await pusherServer.trigger(`chat-${sender.id}`, 'new-message', fullMessage);
  await pusherServer.trigger('global-messages', 'new-message', {
    senderId: sender.id,
    senderName: sender.name,
    receiverId,
    content,
  });

  return NextResponse.json(fullMessage);
}

// GET: Fetch chat messages
export async function GET(req: NextRequest) {
  const session = await getServerSession({ req, ...authOptions });
  const withUserId = req.nextUrl.searchParams.get('with');

  if (!session?.user?.email || !withUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUser.id, receiverId: withUserId },
        { senderId: withUserId, receiverId: currentUser.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(messages);
}

// PATCH: Mark messages as read
export async function PATCH(req: NextRequest) {
  const session = await getServerSession({ req, ...authOptions });
  const body = await req.json();
  const { withUserId } = body;

  if (!session?.user?.email || !withUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.message.updateMany({
    where: {
      senderId: withUserId,
      receiverId: currentUser.id,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return NextResponse.json({ status: 'ok' });
}
