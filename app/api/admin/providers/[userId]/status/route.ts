import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb"; // Assuming this path is correct
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
// import { Prisma } from "@prisma/client"; // Removed if not used

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);

  // 1. Authorization: Only allow ADMINs
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = params;
  let status: string;
  let notes: string | null;

  try {
    const body = await req.json();
    status = body.status;
    notes = body.notes || null;
  } catch (error) {
    console.error("❌ Error parsing request body:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }


  // 2. Input Validation: Ensure status is valid
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status. Must be 'APPROVED' or 'REJECTED'." }, { status: 400 });
  }

  const isApproved = status === "APPROVED";

  try {
    // Check if the business verification record exists before attempting to update
    const existingVerification = await prisma.businessVerification.findUnique({
      where: { userId },
    });

    if (!existingVerification) {
      return NextResponse.json(
        { error: "Business verification record not found for this user." },
        { status: 404 }
      );
    }

    // 3. Perform atomic updates using Prisma transactions
    // This ensures that either both updates succeed or both fail, maintaining data consistency.
    const [updatedUser, updatedVerification] = await prisma.$transaction([
      // Update the user's general 'verified' status
      prisma.user.update({
        where: { id: userId },
        data: { verified: isApproved },
      }),
      // Update the specific business verification record
      prisma.businessVerification.update({
        where: { userId },
        data: {
          verified: isApproved, // Update the verification record's status
          verificationNotes: notes, // Store notes, null if not provided
          updatedAt: new Date(), // Update timestamp
        },
      }),
    ]);

    // 4. Success Response
    return NextResponse.json({ success: true, verification: updatedVerification });

  } catch (error: any) {
    // 5. Error Handling
    console.error("❌ Error during provider verification update:", error);
    // Provide a generic error message to the client for security
    return NextResponse.json(
      { error: "Failed to update verification status due to an internal server error." },
      { status: 500 }
    );
  }
}