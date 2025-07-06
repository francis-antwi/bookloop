import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import { addDays, format } from 'date-fns';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get('listingId');

  if (!listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });

  // Fetch listing base price
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  // Fetch reservations (same as occupancy predictor)
  const reservations = await prisma.reservation.findMany({
    where: {
      listingId,
      endDate: { lt: new Date() },
    },
  });

  const dayCount = Array(7).fill(0);
  reservations.forEach((res) => {
    const start = new Date(res.startDate);
    const end = new Date(res.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dayCount[d.getDay()]++;
    }
  });

  const totalDays = reservations.length * 3;
  const dayProb = dayCount.map((count) => count / totalDays);

  const today = new Date();
  const predictions = Array.from({ length: 30 }).map((_, i) => {
    const date = addDays(today, i);
    const day = date.getDay();
    const prob = dayProb[day] || 0;

    let multiplier = 1.0;
    if (prob > 0.8) multiplier = 1.2;
    else if (prob > 0.6) multiplier = 1.1;
    else if (prob < 0.3) multiplier = 0.9;

    return {
      date: format(date, 'yyyy-MM-dd'),
      basePrice: listing.price,
      suggestedPrice: parseFloat((listing.price * multiplier).toFixed(2)),
      occupancyProbability: parseFloat(prob.toFixed(2)),
    };
  });

  return NextResponse.json(predictions);
}
