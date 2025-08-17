import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import { addDays, format } from 'date-fns';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get('listingId');

  if (!listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });

  // Get all past reservations for this listing
  const reservations = await prisma.reservation.findMany({
    where: {
      listingId,
      endDate: {
        lt: new Date(), // only past reservations
      },
    },
  });

  // Count how many times each day of the week is occupied
  const dayCount = Array(7).fill(0); // Sunday=0 ... Saturday=6
  const totalCount = Array(7).fill(0); // total days of each type

  reservations.forEach((res) => {
    const start = new Date(res.startDate);
    const end = new Date(res.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      dayCount[day]++;
    }
  });

  // Normalize to get occupancy probability per weekday
  const totalDays = reservations.length * 3; // assuming average 3-day stays
  const dayProb = dayCount.map((count) => count / totalDays);

  // Predict for next 30 days
  const today = new Date();
  const predictions = Array.from({ length: 30 }).map((_, i) => {
    const date = addDays(today, i);
    const day = date.getDay();
    return {
      date: format(date, 'yyyy-MM-dd'),
      occupiedProbability: parseFloat(dayProb[day]?.toFixed(2)) || 0,
    };
  });

  return NextResponse.json(predictions);
}
