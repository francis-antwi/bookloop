import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const providers = await prisma.user.findMany({
    where: { role: "PROVIDER" },
    select: {
      id: true,
      name: true,
      email: true,
      contactPhone: true,
      verified: true,
      createdAt: true,
      businessVerification: {
        select: {
          businessName: true,
          verified: true,
          submittedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const data = providers.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.contactPhone,
    status:
      p.businessVerification?.verified || p.verified ? "APPROVED" : "PENDING",
    businessName: p.businessVerification?.businessName || "",
    submittedAt: p.businessVerification?.submittedAt,
  }));

  return NextResponse.json(data);
}
