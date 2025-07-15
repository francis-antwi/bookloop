import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";


import prisma from "@/app/libs/prismadb";
import authOptions from "@/app/auth/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions); 
 
  console.log("✅ Admin session:", session);

  if (!session || session.user.role !== "ADMIN") {
    console.warn("🛑 Forbidden: user not admin or session missing");
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
    orderBy: { createdAt: "desc" },
  });

  const data = providers.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.contactPhone,
    status: p.businessVerification?.verified ? "APPROVED" : p.verified ? "APPROVED" : "PENDING",
    businessName: p.businessVerification?.businessName || "",
    submittedAt: p.businessVerification?.submittedAt,
  }));

  return NextResponse.json(data);
}
