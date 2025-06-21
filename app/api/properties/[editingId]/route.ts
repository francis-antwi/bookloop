import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

// Category-specific fields
const categoryFields = {
  Apartment: ['bedrooms', 'bathrooms', 'furnished', 'floor'],
  Car: ['make', 'model', 'year', 'seats', 'fuelType'],
  EventCenter: ['capacity', 'rooms', 'hasStage', 'parkingAvailable'],
  Restaurant: ['cuisineType', 'seatingCapacity', 'openingHours', 'deliveryAvailable', 'menuHighlights'],
  Appointment: ['serviceType', 'availableDates', 'duration', 'requiresBooking', 'serviceProvider'],
};

export async function PUT(
  request: Request,
  context: { params: { editingId: string } }
) {
  try {
    const { editingId } = context.params;
    console.log("Received PUT request with ID:", editingId);

    if (!editingId || typeof editingId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid listing ID" },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("Received body:", body);

    const requiredFields = [
      "title",
      "description",
      "price",
      "contactPhone",
      "address",
    ];
    const missingFields = requiredFields.filter(
      (field) => !body[field]
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    const parsedPrice = parseFloat(body.price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    // Check listing ownership
    const existingListing = await prisma.listing.findFirst({
      where: {
        id: editingId,
        userId: currentUser.id,
      },
    });

    if (!existingListing) {
      return NextResponse.json(
        { error: "Listing not found or you do not have permission" },
        { status: 404 }
      );
    }

    const updateData: any = {
      title: body.title,
      description: body.description,
      price: parsedPrice,
      contactPhone: body.contactPhone,
      address: body.address,
      ...(body.email && { email: body.email }),
      ...(body.imageSrc && { imageSrc: body.imageSrc }),
      ...(body.status && { status: body.status }),
      ...(body.category && { category: body.category }),
      ...(body.createdAt && { createdAt: new Date(body.createdAt) }),
    };

    // Merge category-specific fields
    if (body.category && categoryFields[body.category]) {
      for (const field of categoryFields[body.category]) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }
    }

    const updatedListing = await prisma.listing.update({
      where: { id: editingId },
      data: updateData,
    });

    console.log("Listing successfully updated:", updatedListing);
    return NextResponse.json(updatedListing, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
