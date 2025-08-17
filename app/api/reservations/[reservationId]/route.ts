import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function DELETE(
  request: Request,
  { params }: { params: { reservationId?: string } }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!params?.reservationId) {
    return NextResponse.json({ message: "Reservation ID required" }, { status: 400 });
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.reservationId },
    });

    if (!reservation) {
      return NextResponse.json({ message: "Reservation not found" }, { status: 404 });
    }

    // Only the user who made the reservation can delete it
    if (reservation.userId !== currentUser.id) {
      return NextResponse.json({ message: "Not authorized to delete this reservation" }, { status: 403 });
    }

    // Delete the reservation from DB
    await prisma.reservation.delete({
      where: { id: params.reservationId },
    });

    return NextResponse.json({ message: "Reservation deleted successfully" });
  } catch (error) {
    console.error("Failed to delete reservation:", error);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
