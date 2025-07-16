import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/app/libs/prismadb';

export async function GET(req: Request) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const currentUserEmail = token?.email;

  if (!currentUserEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: currentUserEmail },
  });

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userReservations = await prisma.reservation.findMany({
    where: { userId: currentUser.id },
    select: { listingId: true },
  });

  const userListingIds = userReservations.map(r => r.listingId);

  const similarReservations = await prisma.reservation.findMany({
    where: {
      listingId: { in: userListingIds },
      userId: { not: currentUser.id },
    },
    select: { userId: true },
  });

  const similarUserIds = [...new Set(similarReservations.map(r => r.userId))];

  const otherReservations = await prisma.reservation.findMany({
    where: {
      userId: { in: similarUserIds },
      listingId: { notIn: userListingIds },
    },
    select: { listingId: true },
  });

  const frequency: Record<string, number> = {};
  otherReservations.forEach(r => {
    frequency[r.listingId] = (frequency[r.listingId] || 0) + 1;
  });

  const sortedListingIds = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const listings = await prisma.listing.findMany({
    where: {
      id: { in: sortedListingIds.map(id => Number(id)) }, // if ID is a number
    },
  });

  return NextResponse.json(listings);
}
