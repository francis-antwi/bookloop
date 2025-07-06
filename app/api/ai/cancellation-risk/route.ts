import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import { differenceInDays } from 'date-fns';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reservationId = searchParams.get('reservationId');

  if (!reservationId) {
    return NextResponse.json({ error: 'Missing reservationId' }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { user: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }

  // Rule-based score
  let score = 0;

  // Booking lead time
  const leadTime = differenceInDays(new Date(reservation.startDate), new Date(reservation.createdAt));
  if (leadTime > 30) score += 0.1;
  if (leadTime < 3) score += 0.3;

  // Check if user has canceled before
  const userCancellations = await prisma.reservation.count({
    where: {
      userId: reservation.userId,
      status: 'CANCELLED',
    },
  });

  if (userCancellations > 2) score += 0.4;
  else if (userCancellations > 0) score += 0.2;

  // Short reservations tend to cancel more
  const stayLength = differenceInDays(new Date(reservation.endDate), new Date(reservation.startDate));
  if (stayLength <= 2) score += 0.1;

  // Cap between 0 and 1
  score = Math.min(1, Math.max(0, score));

  // Optionally: save it
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { cancellationRisk: score },
  });

  return NextResponse.json({ reservationId, cancellationRisk: score });
}
