import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/authOptions';
import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getServerSession({ req, ...authOptions });

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (admin?.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      sender: true,
      receiver: true,
    },
  });

  return NextResponse.json(messages);
}
