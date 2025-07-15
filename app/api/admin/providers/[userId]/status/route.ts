import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Prisma } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = params;
  const { status, notes } = await req.json();

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const isApproved = status === "APPROVED";

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { verified: isApproved },
    });

    const existingVerification = await prisma.businessVerification.findUnique({
      where: { userId },
    });

    if (!existingVerification) {
      return NextResponse.json(
        { error: "Business verification record not found" },
        { status: 404 }
      );
    }

    const verification = await prisma.businessVerification.update({
      where: { userId },
      data: {
        verified: isApproved,
        verificationNotes: notes || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, verification });
  } catch (error: any) {
    console.error("❌ Error during provider verification update:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
