import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/app/libs/prismadb";
import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        if (!user.isFaceVerified) {
          throw new Error("Face verification is required before signing in.");
        }

        if (!user.role) {
          throw new Error("Please select a role before signing in.");
        }

        return user;
      },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/auth/callback-error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        let existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        // If this is a first-time Google login
        if (!existingUser) {
          try {
            existingUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name ?? "",
                image: user.image ?? "",
                isFaceVerified: false,
                isOtpVerified: false,
                role: UserRole.CUSTOMER, // Fixed: Set default role to CUSTOMER
              },
            });

            // Force redirect to ID verification
            return "/role";
          } catch (err) {
            console.error("🔴 Error creating new Google user:", err);
            return "/auth/callback-error?reason=account-creation-failed";
          }
        }

        // Redirect if role is missing or face not verified
        if (!existingUser.role || !existingUser.isFaceVerified) {
          return "/verify-id";
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.isFaceVerified = user.isFaceVerified;
        token.selfieImage = user.selfieImage;
        token.idImage = user.idImage;
        token.faceConfidence = user.faceConfidence;

        // Safely access optional fields
        token.idName = user.idName || null;
        token.idNumber = user.idNumber || null;
        token.idDOB = user.idDOB ? user.idDOB.toISOString() : null;
        token.idExpiryDate = user.idExpiryDate ? user.idExpiryDate.toISOString() : null;
        token.idIssuer = user.idIssuer || null;

        token.personalIdNumber = user.personalIdNumber || null;
        token.idIssueDate = user.idIssueDate ? user.idIssueDate.toISOString() : null;

        token.isOtpVerified = user.isOtpVerified || false;
        token.otpCode = user.otpCode || null;
        token.otpExpiresAt = user.otpExpiresAt ? user.otpExpiresAt.toISOString() : null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as UserRole;
        session.user.isFaceVerified = token.isFaceVerified as boolean;
        session.user.selfieImage = token.selfieImage as string | null;
        session.user.idImage = token.idImage as string | null;
        session.user.faceConfidence = token.faceConfidence as number | null;

        // Add type safety for all extended session properties
        session.user.idName = token.idName as string | null;
        session.user.idNumber = token.idNumber as string | null;
        session.user.idDOB = token.idDOB as string | null;
        session.user.idExpiryDate = token.idExpiryDate as string | null;
        session.user.idIssuer = token.idIssuer as string | null;

        session.user.personalIdNumber = token.personalIdNumber as string | null;
        session.user.idIssueDate = token.idIssueDate as string | null;

        session.user.isOtpVerified = token.isOtpVerified as boolean;
        session.user.otpCode = token.otpCode as string | null;
        session.user.otpExpiresAt = token.otpExpiresAt as string | null;
      }
      return session;
    },
  },
};

// Extend session user type to include custom properties
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: UserRole;
      isFaceVerified?: boolean;
      selfieImage?: string | null;
      idImage?: string | null;
      faceConfidence?: number | null;
      idName?: string | null;
      idNumber?: string | null;
      idDOB?: string | null;
      idExpiryDate?: string | null;
      idIssuer?: string | null;
      personalIdNumber?: string | null;
      idIssueDate?: string | null;
      isOtpVerified?: boolean;
      otpCode?: string | null;
      otpExpiresAt?: string | null;
    };
  }
}

export default NextAuth(authOptions);