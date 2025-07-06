import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { differenceInMinutes } from "date-fns";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reservationId = searchParams.get("reservationId");

  if (!reservationId) {
    return NextResponse.json({ error: "Missing reservationId" }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { listing: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  const overlapping = await prisma.reservation.findMany({
    where: {
      listingId: reservation.listingId,
      id: { not: reservation.id },
      startDate: { lte: reservation.endDate },
      endDate: { gte: reservation.startDate },
    },
  });

  let risk = 0;

  // Overlaps at all
  if (overlapping.length > 0) risk += 0.4;

  // Tight gaps (less than 2 hours) — simulate for hourly bookings
  for (const other of overlapping) {
    const gapBefore = differenceInMinutes(new Date(reservation.startDate), new Date(other.endDate));
    const gapAfter = differenceInMinutes(new Date(other.startDate), new Date(reservation.endDate));

    if (gapBefore >= 0 && gapBefore < 120) risk += 0.3;
    if (gapAfter >= 0 && gapAfter < 120) risk += 0.3;
  }

  risk = Math.min(1, Math.max(0, risk));

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { overbookingRisk: risk },
  });

  return NextResponse.json({ reservationId, overbookingRisk: risk });
}
