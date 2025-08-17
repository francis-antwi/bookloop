import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { sendNotification } from "@/app/api/utils/notification";
import { ReservationStatus, NotificationType } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: { reservationId?: string } }
) {
  console.log("Params received:", params);
  if (!params?.reservationId) {
    return NextResponse.json({ error: "Invalid reservation ID" }, { status: 400 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reason } = await request.json();

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.reservationId },
      include: { listing: true, user: true,},
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    const isCustomer = reservation.userId === currentUser.id;
    const isProvider = reservation.listing.userId === currentUser.id;

    if (!isCustomer && !isProvider) {
      return NextResponse.json(
        { error: "Unauthorized to cancel this reservation" },
        { status: 403 }
      );
    }

    const updated = await prisma.reservation.update({
      where: { id: params.reservationId },
      data: { status: ReservationStatus.CANCELLED },
      include: { listing: true, user: true },
    });

    // Prepare contact details from listing owner (provider)
    const provider = await prisma.user.findUnique({
      where: { id: reservation.listing.userId },
      select: { email: true, contactPhone: true },
    });

    const email = provider?.email;
    const contactPhone = provider?.contactPhone;

    // Compose cancellation message
    let notificationMessage = `Your booking for "${updated.listing.title}" has been cancelled.`;
    if (reason) notificationMessage += ` Reason: ${reason}`;

    // Send notification to reservation user (customer)
    await sendNotification(
      updated.userId,
      notificationMessage,
      NotificationType.BOOKING,
      { email, contactPhone }
    );

    console.log(`Reservation ${updated.id} canc
      elled by user ${currentUser.id}`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(
      "Cancel error:",
      error?.response?.data || error?.message || "Failed to cancel reservation"
    );
    return NextResponse.json(
      { error: error?.response?.data?.error || error?.message || "Failed to cancel reservation" },
      { status: 500 }
    );
  }
}
