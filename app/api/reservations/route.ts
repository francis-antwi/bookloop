import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { sendNotification } from "../utils/notification";
import { ReservationStatus, NotificationType } from "@prisma/client";
import prisma from "@/app/libs/prismadb";

// GET: Fetch reservations for listings owned by the current user
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        listing: {
          userId: currentUser.id,
        },
      },
      include: {
        listing: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("GET /api/reservations Error:", error);
    return NextResponse.json(
      { error: "Failed to load reservations." },
      { status: 500 }
    );
  }
}

// POST: Create a new reservation
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      listingId,
      startDate,
      endDate,
      totalPrice,
      contactPhone,
    } = body;

    // Validate required fields
    if (!listingId || !startDate || !endDate || !totalPrice) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date must be before end date." },
        { status: 400 }
      );
    }

    // Check for conflicting reservations
    const conflicting = await prisma.reservation.findFirst({
      where: {
        listingId,
        OR: [
          {
            startDate: { lte: new Date(endDate) },
            endDate: { gte: new Date(startDate) },
          },
        ],
      },
    });

    if (conflicting) {
      return NextResponse.json(
        { error: "Listing already reserved for selected dates." },
        { status: 409 }
      );
    }

    // Create reservation with status PENDING
    const reservation = await prisma.reservation.create({
      data: {
        listingId,
        userId: currentUser.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalPrice,
        contactPhone,
        status: ReservationStatus.PENDING,
      },
    });

    // Notify listing owner if available
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true, title: true },
    });

    if (listing?.userId) {
      await sendNotification(
        listing.userId,
        `You have a new reservation for ${listing.title}`,
        NotificationType.BOOKING,
        {
          contactPhone: currentUser.contactPhone,
          payload: {
            reservationId: reservation.id,
            listingId,
          },
        }
      );
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("POST /api/reservations Error:", error);
    return NextResponse.json(
      { error: "Failed to create reservation." },
      { status: 500 }
    );
  }
}
