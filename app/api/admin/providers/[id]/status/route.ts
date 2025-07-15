import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = params;
  const { status, notes } = await req.json();

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const isApproved = status === "APPROVED";

  try {
    // 1. Update user.verified flag
    await prisma.user.update({
      where: { id },
      data: { verified: isApproved },
    });

    // 2. Check if businessVerification exists before updating
    const existingVerification = await prisma.businessVerification.findUnique({
      where: { userId: id },
    });

    if (!existingVerification) {
      return NextResponse.json(
        { error: "Business verification record not found" },
        { status: 404 }
      );
    }

    // 3. Update businessVerification
    const verification = await prisma.businessVerification.update({
      where: { userId: id },
      data: {
        verified: isApproved,
        verificationNotes: notes || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, verification });
  } catch (error) {
    console.error("❌ Failed to update provider verification", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
