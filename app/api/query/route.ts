import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  try {
    const listing = await prisma.listing.findFirst({
      where: {
        address: {
          contains: address,
          mode: "insensitive"
        }
      }
    });

    if (listing) {
      return NextResponse.json(listing, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Location not found' }, { status: 404 });
    }
  } catch (error) {
    // Log the error to the console
    console.error("Error fetching listing:", error);
    return NextResponse.json({ error: 'Error fetching listing' }, { status: 500 });
  }
}
