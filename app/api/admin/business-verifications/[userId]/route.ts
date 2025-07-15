// /app/api/admin/business-verifications/[userId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/app/libs/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const userId = params.userId;

  const verification = await prisma.businessVerification.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  if (!verification) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json({
    provider: verification.user,
    businessName: verification.businessName,
    businessType: verification.businessType,
    tinNumber: verification.tinNumber,
    registrationNumber: verification.registrationNumber,
    submittedAt: verification.submittedAt,
    verified: verification.verified,
    documents: {
      tin: verification.tinCertificateUrl,
      incorporation: verification.incorporationCertUrl,
      vat: verification.vatCertificateUrl,
      ssnit: verification.ssnitCertUrl,
    },
  });
}
