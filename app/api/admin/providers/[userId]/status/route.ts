import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
  let notes: string | null = null;

  try {
    const body = await req.json();
    status = body.status;
    notes = body.notes || null;
  } catch (error) {
    console.error("❌ Error parsing request body:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // 2. Input Validation
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be 'APPROVED' or 'REJECTED'." },
      { status: 400 }
    );
  }

  const isApproved = status === "APPROVED";

  try {
    // 3. Update user.businessVerified (and optionally add admin notes)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        businessVerified: isApproved,
        // adminNotes: notes, // Optional: uncomment if you add this field
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("❌ Error updating user.businessVerified:", error);
    return NextResponse.json(
      { error: "Failed to update business verification status." },
      { status: 500 }
    );
  }
}
