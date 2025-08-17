// src/app/actions/getCurrentUser.ts
import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import prisma from "@/app/libs/prismadb";
import { authOptions } from "../auth/authOptions";

interface SessionUser {
  email?: string | null;
}

interface TokenUser {
  email?: string;
}

interface SanitizedUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  role?: string;
  isOtpVerified?: boolean;
  isFaceVerified?: boolean;
  businessVerified?: boolean;
}

export async function getSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export default async function getCurrentUser(): Promise<SanitizedUser | null> {
  try {
    const session = await getSession();
    const sessionEmail = session?.user?.email;

    const tokenEmail = !sessionEmail
      ? (await getFallbackToken())?.email
      : null;

    const email = sessionEmail || tokenEmail;
    if (!email) return null;

    const currentUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        isOtpVerified: true,
        isFaceVerified: true,
        businessVerified: true, 
        category: true 
        // ✅ FIXED: no type annotation
      },
    });

    if (!currentUser) return null;

    return JSON.parse(JSON.stringify(sanitizeUser(currentUser)));
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

async function getFallbackToken(): Promise<TokenUser | null> {
  try {
    const token = await getToken({
      req: { headers: { cookie: cookies().toString() } },
      secret: process.env.NEXTAUTH_SECRET,
    });
    return token as TokenUser | null;
  } catch (error) {
    console.error("Error getting fallback token:", error);
    return null;
  }
}

function sanitizeUser(user: any): SanitizedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified?.toISOString() || null,
    image: user.image,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    role: user.role,
    isOtpVerified: user.isOtpVerified,
    isFaceVerified: user.isFaceVerified,
    businessVerified: user.businessVerified,
  };
}
