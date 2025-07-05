import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/authOptions";
import prisma from "@/app/libs/prismadb";

export async function POST(req: NextRequest) {
  const session = await getServerSession({ req, ...authOptions });
  const body = await req.json();

  const { listingId, rating, comment } = body;

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const review = await prisma.review.create({
      data: {
        userId: user.id,
        listingId,
        rating,
        comment
      }
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Review already exists or error saving review" }, { status: 400 });
  }
}
