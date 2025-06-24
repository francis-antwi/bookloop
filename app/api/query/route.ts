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
      },
      select: {
        address: true, // ✅ only select address
      }
    });

    if (listing) {
      return NextResponse.json({ address: listing.address }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Location not found' }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json({ error: 'Error fetching listing' }, { status: 500 });
  }
}
