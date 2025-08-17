import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.log("Unauthorized: no current user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "ADMIN") {
      console.log("Forbidden: user is not an admin");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { listingId, status } = await request.json();

    if (!listingId || !status) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update the listing and include the owner info
    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: { status },
      include: { user: true },
    });

    console.log("Listing updated with ID:", updatedListing.id);

    // If listing was approved, notify the user
    if (status === "APPROVED") {
      await prisma.notification.create({
        data: {
          userId: updatedListing.user.id,
          message: `Your listing "${updatedListing.title}" has been approved.`,
          type: "SYSTEM",
          email: updatedListing.user.email,
          contactPhone: updatedListing.user.contactPhone || null,
          adminOnly: false,
        },
      });

      console.log(`Notification sent to user ID: ${updatedListing.user.id}`);
    }

    return NextResponse.json(updatedListing, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/listings/${id}/approve", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
