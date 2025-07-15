import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/app/libs/prismadb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
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
          businessType: true,
          businessAddress: true,
          verified: true,
          submittedAt: true,
          verificationNotes: true,
          tinNumber: true,
          registrationNumber: true,
          tinCertificateUrl: true,
          incorporationCertUrl: true,
          vatCertificateUrl: true,
          ssnitCertUrl: true,
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
    status: p.businessVerification?.verified || p.verified ? "APPROVED" : "PENDING",
    submittedAt: p.businessVerification?.submittedAt,
    businessName: p.businessVerification?.businessName || "",
    businessType: p.businessVerification?.businessType || "",
    businessAddress: p.businessVerification?.businessAddress || "",
    verificationNotes: p.businessVerification?.verificationNotes || "",
    tinNumber: p.businessVerification?.tinNumber || "",
    registrationNumber: p.businessVerification?.registrationNumber || "",
    documents: {
      tinCertificate: p.businessVerification?.tinCertificateUrl || null,
      vatCertificate: p.businessVerification?.vatCertificateUrl || null,
      ssnitCertificate: p.businessVerification?.ssnitCertUrl || null,
      incorporationCertificate: p.businessVerification?.incorporationCertUrl || null,
    },
  }));

  return NextResponse.json(data);
}
