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
    include: { user: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  const createdMinutesAgo = differenceInMinutes(new Date(), new Date(reservation.createdAt));
  let score = 0;

  // User account is less than 1 day old
  const userAgeMinutes = differenceInMinutes(new Date(), new Date(reservation.user.createdAt));
  if (userAgeMinutes < 1440) score += 0.3;

  // Late night booking (e.g., 2am - 4am)
  const bookingHour = new Date(reservation.createdAt).getHours();
  if (bookingHour < 5 || bookingHour > 23) score += 0.2;

  // Created very quickly after registration
  if (userAgeMinutes > 0 && createdMinutesAgo / userAgeMinutes < 0.1) score += 0.2;

  // Add cancellation history weight
  const userCancellations = await prisma.reservation.count({
    where: {
      userId: reservation.userId,
      status: "CANCELLED",
    },
  });

  if (userCancellations > 2) score += 0.3;

  score = Math.min(1, Math.max(0, score));

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { fraudRisk: score },
  });

  return NextResponse.json({ reservationId, fraudRisk: score });
}
