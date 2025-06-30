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

  if (existingUser) return existingUser;

  return await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      contactPhone: data.contactPhone,
      role: data.role,
      selfieUrl: data.selfieUrl,
      idUrl: data.idUrl,
      idName: data.idName,
      idNumber: data.idNumber,
      idDOB: data.idDOB,
      idExpiryDate: data.idExpiryDate,
      idIssuer: data.idIssuer,
      isVerified: true, // optional, depending on your schema
    }
  });
}
