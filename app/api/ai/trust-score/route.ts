import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const reservations = await prisma.reservation.findMany({
    where: { userId },
    include: { review: true },
  });

  const completed = reservations.filter(r => r.status === "APPROVED").length;
  const cancelled = reservations.filter(r => r.status === "CANCELLED").length;
  const total = reservations.length;

  const reviewScores = reservations
    .map(r => r.review?.rating)
    .filter(Boolean) as number[];

  const avgRating = reviewScores.length
    ? reviewScores.reduce((sum, r) => sum + r, 0) / reviewScores.length
    : 0;

  let score = 1;

  if (total === 0) score = 0;
  else {
    const cancelRate = cancelled / total;
    score -= cancelRate * 0.5;

    if (avgRating) score += (avgRating - 3) / 4 * 0.4; // from 0 to +0.4
  }

  score = Math.max(0, Math.min(1, score));

  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: score },
  });

  return NextResponse.json({ userId, trustScore: score });
}
