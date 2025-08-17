
import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
