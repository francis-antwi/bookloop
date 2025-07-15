import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/app/libs/prismadb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const submissions = await prisma.businessVerification.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  const data = submissions.map((submission) => ({
    provider: {
      name: submission.user.name,
      email: submission.user.email,
    },
    businessName: submission.businessName || "",
    businessType: submission.businessType || "",
    businessAddress: submission.businessAddress || "",
    tinNumber: submission.tinNumber || "",
    registrationNumber: submission.registrationNumber || "",
    submittedAt: submission.submittedAt,
    verified: submission.verified,
    documents: {
      tin: submission.tinCertificateUrl || null,
      incorporation: submission.incorporationCertUrl || null,
      vat: submission.vatCertificateUrl || null,
      ssnit: submission.ssnitCertUrl || null,
    },
  }));

  return NextResponse.json(data);
}
