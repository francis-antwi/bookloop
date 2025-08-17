// app/api/notifications/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Notification deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
