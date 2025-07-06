import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");

  if (!listingId) {
    return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Gather similar listings (same category & city) in the last 30 days
  const recentBookings = await prisma.reservation.findMany({
    where: {
      listing: {
        category: listing.category,
        address: { contains: listing.address?.split(",")[1]?.trim() || "" },
      },
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    include: { listing: true },
  });

  const averagePrice = recentBookings.length
    ? recentBookings.reduce((sum, r) => sum + (r.listing.price || 0), 0) / recentBookings.length
    : listing.price;

  // Adjust based on popularity, lead time, etc. (you can enhance this)
  const popularityBoost = (listing.views ?? 0) > 50 ? 1.1 : 1.0;
  const adjustedPrice = Math.round(averagePrice * popularityBoost);

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: { suggestedPrice: adjustedPrice },
  });

  return NextResponse.json({ listingId, suggestedPrice: updated.suggestedPrice });
}
