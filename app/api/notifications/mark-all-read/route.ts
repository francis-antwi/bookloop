
import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

export async function POST() {
  try {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
  }
}
