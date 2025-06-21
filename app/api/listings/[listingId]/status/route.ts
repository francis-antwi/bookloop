import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function PATCH(
  request: Request,
  { params }: { params: { listingId?: string } }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!params?.listingId) {
    return NextResponse.json({ message: "Listing ID required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const updatedListing = await prisma.listing.update({
      where: { id: params.listingId },
      data: { status },
    });

    return NextResponse.json(updatedListing);
  } catch (error) {
    console.error("Failed to update listing status:", error);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
