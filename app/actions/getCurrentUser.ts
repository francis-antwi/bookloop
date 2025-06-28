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
  // Add other user fields as needed
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
    // Attempt to get email from session first
    const session = await getSession();
    const sessionEmail = session?.user?.email;

    // Fallback to token if no session email
    const tokenEmail = !sessionEmail 
      ? (await getFallbackToken())?.email 
      : null;

    const email = sessionEmail || tokenEmail;
    if (!email) return null;

    // Fetch user from database
    const currentUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!currentUser) return null;

    // Sanitize and format dates
    return sanitizeUser(currentUser);
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
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    emailVerified: user.emailVerified?.toISOString() || null,
  };
}