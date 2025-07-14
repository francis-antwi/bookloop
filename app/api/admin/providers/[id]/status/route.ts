import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import authOptions from "@/app/auth/authOptions";
import { UserRole } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = params;
  const { status } = await req.json();

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        verified: status === "APPROVED",
        businessVerification: {
          update: {
            verified: status === "APPROVED",
            reviewedAt: new Date(),
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        verified: true,
        businessVerification: true
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update provider status", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
