// src/app/actions/getCurrentUser.ts
import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import prisma from "@/app/libs/prismadb";
import { authOptions } from "../auth/authOptions"; // Ensure this path is correct relative to this file

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
  // Add other user fields like 'role', 'isOtpVerified', 'isFaceVerified' as needed
  role?: string; // Assuming UserRole is a string
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
    // Attempt to get email from session first
    const session = await getSession();
    const sessionEmail = session?.user?.email;

    // Fallback to token if no session email is available
    // Note: getToken can only be used in server-side contexts like API routes or getServerSideProps/Server Components
    const tokenEmail = !sessionEmail
      ? (await getFallbackToken())?.email
      : null;

    const email = sessionEmail || tokenEmail;
    if (!email) return null;

    // Fetch user from database
    const currentUser = await prisma.user.findUnique({
      where: { email },
      // Include any other fields you expect to return to the client
      // For example, if 'role' is part of SanitizedUser, ensure it's selected here
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        role: true, // Assuming you need the role in the client
        isOtpVerified: true,
        isFaceVerified: true,
        businessVerified: boolean,
      },
    });

    if (!currentUser) return null;

    // Sanitize and format dates, and include other relevant user data
    // New: Aggressively serialize the user object to ensure no non-JSON-serializable data is passed
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
  // Ensure all properties in SanitizedUser are handled
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified?.toISOString() || null,
    image: user.image,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    role: user.role, // Include role
    isOtpVerified: user.isOtpVerified,
    isFaceVerified: user.isFaceVerified,
    businessVerified:user.businessVerified
  };
}
