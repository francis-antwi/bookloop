import prisma from "@/app/libs/prismadb";

interface RegistrationData {
  email: string;
  name: string;
  contactPhone: string;
  role: "PROVIDER";
  selfieUrl: string;
  idUrl: string;
  idName?: string;
  idNumber?: string;
  idDOB?: string;
  idExpiryDate?: string;
  idIssuer?: string;
}

export async function createUserIfNeeded(data: RegistrationData) {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    console.log("👤 [User already exists]:", existingUser.email);
    return existingUser;
  }

  const userPayload = {
    email: data.email,
    name: data.name,
    contactPhone: data.contactPhone,
    role: data.role,
    selfieUrl: data.selfieUrl,
    idUrl: data.idUrl,
    idName: data.idName || null,
    idNumber: data.idNumber || null,
    idDOB: data.idDOB || null,
    idExpiryDate: data.idExpiryDate || null,
    idIssuer: data.idIssuer || null,
    isVerified: true,
  };

  console.log("💾 [Creating new PROVIDER user]:", userPayload);

  return await prisma.user.create({ data: userPayload });
}
