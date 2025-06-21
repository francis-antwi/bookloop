import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { Prisma } from "@prisma/client";
import { sendNotification } from "../utils/notification";

// GET: Fetch all listings
export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(listings, { status: 200 });
  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}

// POST: Create a new listing
export async function POST(request: Request) {
  try {
    console.log("POST /api/listings called");

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.log("Unauthorized: no current user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("Current user:", currentUser.id);

    const body = await request.json();
    console.log("Request body:", body);

    const {
      title,
      description,
      imageSrc,
      category,
      price,
      contactPhone,
      email,
      address,

      bedrooms,
      bathrooms,
      furnished,
      floor,

      make,
      model,
      year,
      seats,
      fuelType,

      capacity,
      rooms,
      hasStage,
      parkingAvailable,

      cuisineType,
      seatingCapacity,
      openingHours,
      deliveryAvailable,
      menuHighlights,

      serviceType,
      availableDates,
      duration,
      requiresBooking,
      serviceProvider,
    } = body;

    if (
      !title ||
      !description ||
      !imageSrc ||
      !category ||
      !price ||
      !contactPhone ||
      !email ||
      !address
    ) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const data: any = {
      title,
      description,
      imageSrc,
      category,
      price: parseInt(price, 10),
      userId: currentUser.id,
      contactPhone,
      email,
      address,
      status: "PENDING", // Set initial status to PENDING
    };

    // Add category-specific fields
    if (bedrooms !== undefined) data.bedrooms = parseInt(bedrooms, 10);
    if (bathrooms !== undefined) data.bathrooms = parseInt(bathrooms, 10);
    if (floor !== undefined) data.floor = parseInt(floor, 10);
    if (furnished !== undefined) data.furnished = Boolean(furnished);

    if (make !== undefined) data.make = make;
    if (model !== undefined) data.model = model;
    if (year !== undefined) data.year = parseInt(year, 10);
    if (seats !== undefined) data.seats = parseInt(seats, 10);
    if (fuelType !== undefined) data.fuelType = fuelType;

    if (capacity !== undefined) data.capacity = parseInt(capacity, 10);
    if (rooms !== undefined) data.rooms = parseInt(rooms, 10);
    if (hasStage !== undefined) data.hasStage = Boolean(hasStage);
    if (parkingAvailable !== undefined)
      data.parkingAvailable = Boolean(parkingAvailable);

    if (cuisineType !== undefined) data.cuisineType = cuisineType;
    if (seatingCapacity !== undefined)
      data.seatingCapacity = parseInt(seatingCapacity, 10);
    if (openingHours !== undefined) data.openingHours = openingHours;
    if (deliveryAvailable !== undefined)
      data.deliveryAvailable = Boolean(deliveryAvailable);
    if (menuHighlights !== undefined) data.menuHighlights = menuHighlights;

    if (serviceType !== undefined) data.serviceType = serviceType;
    if (availableDates !== undefined) data.availableDates = availableDates;
    if (duration !== undefined) data.duration = parseInt(duration, 10);
    if (requiresBooking !== undefined)
      data.requiresBooking = Boolean(requiresBooking);
    if (serviceProvider !== undefined) data.serviceProvider = serviceProvider;

    console.log("Final listing data to create:", data);

    const listing = await prisma.listing.create({ data });

    console.log("Listing created with ID:", listing.id);

    await sendNotification(
      currentUser.id,
      `Your listing "${listing.title}" has been submitted for admin review.`,
      "SYSTEM",
    );
    console.log("Notification sent to listing owner");

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    console.log("Admin users found:", admins.length);

    await Promise.all(
      admins.map((admin) =>
        sendNotification(
          admin.id,
          `New listing "${listing.title}" submitted by ${currentUser.name || "a user"}.`
        )
      )
    );
    console.log("Notifications sent to admins");

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/listings:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
