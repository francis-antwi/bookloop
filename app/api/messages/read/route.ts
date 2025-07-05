import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/authOptions';
import prisma from '@/app/libs/prismadb';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession({ req, ...authOptions });
  const { withUserId } = await req.json();

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

  return NextResponse.json({ success: true });
}
