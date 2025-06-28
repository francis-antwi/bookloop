import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import prisma from "@/app/libs/prismadb";
import { authOptions } from "../auth/authOptions";

export async function getSession() {
  return await getServerSession(authOptions);
}

export default async function getCurrentUser() {
  try {
    let email: string | null = null;

    const session = await getSession();

    if (session?.user?.email) {
      email = session.user.email;
    } else {
      // 🔁 Fallback: Try getting JWT directly from cookies
      const token = await getToken({
        req: { headers: { cookie: cookies().toString() } },
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (token?.email) {
        email = token.email as string;
      }
    }

    if (!email) return null;

    const currentUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!currentUser) return null;

    return {
      ...currentUser,
      createdAt: currentUser.createdAt.toISOString(),
      updatedAt: currentUser.updatedAt.toISOString(),
      emailVerified: currentUser.emailVerified?.toISOString() || null,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
