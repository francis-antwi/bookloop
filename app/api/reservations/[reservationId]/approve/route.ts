import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { ReservationStatus, NotificationType } from "@prisma/client";
import { sendNotification } from "@/app/api/utils/notification";


interface Params {
  params: {
    reservationId: string;
  };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  const reservationId = params.reservationId;

  if (!reservationId) {
    return NextResponse.json(
      { error: "Reservation ID is required" },
      { status: 400 }
    );
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { listing: true, user: true }, 
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Ensure current user is the listing owner
    if (reservation.listing.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Unauthorized - You can only approve your own listings" },
        { status: 401 }
      );
    }

    // Update reservation status to CONFIRMED
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CONFIRMED,
      },
    });

    // Notify the user who made the reservation
    await sendNotification(
      reservation.userId,
      `Your reservation for ${reservation.listing.title} from ${reservation.startDate.toDateString()} to ${reservation.endDate.toDateString()} has been approved!`,
      NotificationType.BOOKING,
      {
        email: currentUser.email,
        contactPhone: currentUser.contactPhone,
        payload: {
          reservationId: reservation.id,
          listingId: reservation.listing.id,
        },
      }
    );

    return NextResponse.json(updatedReservation, { status: 200 });
  } catch (error) {
    console.error("Approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve reservation" },
      { status: 500 }
    );
  }
}
