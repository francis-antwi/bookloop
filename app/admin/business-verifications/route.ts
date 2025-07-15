// app/api/admin/business-verifications/route.ts

import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    console.warn("🛑 Unauthorized access to business verifications");
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const verifications = await prisma.businessVerification.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          contactPhone: true,
          verified: true,
          isFaceVerified: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  const data = verifications.map((v) => ({
    businessName: v.businessName,
    businessType: v.businessType,
    businessAddress: v.businessAddress,
    tinNumber: v.tinNumber,
    registrationNumber: v.registrationNumber,
    verified: v.verified,
    submittedAt: v.submittedAt,
    provider: {
      name: v.user.name,
      email: v.user.email,
      contactPhone: v.user.contactPhone,
      verified: v.user.verified,
      faceVerified: v.user.isFaceVerified,
    },
    documents: {
      tin: v.tinCertificateUrl,
      incorporation: v.incorporationCertUrl,
      vat: v.vatCertificateUrl,
      ssnit: v.ssnitCertUrl,
    },
  }));

  return NextResponse.json(data);
}
