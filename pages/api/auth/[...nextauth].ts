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

        if (!user.isOtpVerified) {
          throw new Error("Phone verification is required before signing in.");
        }

        if (user.role === UserRole.PROVIDER && !user.isFaceVerified) {
          throw new Error("Face verification is required for service providers.");
        }

        if (!user.role) {
          throw new Error("Account is missing a role.");
        }

        return {
          ...user,
          isOtpVerified: user.isOtpVerified ?? true,
          isFaceVerified: user.isFaceVerified ?? false,
        };
      },
    }),
  ],
  pages: {
    signIn: "/",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/select-role", // New users will be redirected here to select role
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        // If user doesn't exist, we'll create a temporary user without a role
        // and redirect to role selection page
        if (!existingUser) {
          try {
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name ?? "",
                image: user.image ?? "",
                isOtpVerified: true, // Skip OTP for Google
                isFaceVerified: false,
                // Don't set role here - user will select it on the next page
              },
            });
            // Redirect to role selection page
            return "/role";
          } catch (err) {
            console.error("Error creating Google user:", err);
            return "/auth/callback-error?reason=account-creation-failed";
          }
        }

        // If user exists but has no role, redirect to role selection
        if (!existingUser.role) {
          return "/role";
        }

        // If user is a provider but not face verified, redirect to verification
        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          return "/verify";
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Handle role updates from the client
      if (trigger === "update" && session?.role) {
        token.role = session.role;
        
        // If role is provider, we'll need verification
        if (session.role === UserRole.PROVIDER) {
          token.isFaceVerified = false;
        }
      }

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.role = user.role;
        token.isOtpVerified = user.isOtpVerified ?? true;
        token.otpCode = user.otpCode ?? null;
        token.otpExpiresAt = user.otpExpiresAt?.toISOString() ?? null;
        token.isFaceVerified = user.isFaceVerified ?? false;

        if (user.role === UserRole.PROVIDER) {
          token.selfieImage = user.selfieImage ?? null;
          token.idImage = user.idImage ?? null;
          token.faceConfidence = user.faceConfidence ?? null;
          token.idName = user.idName ?? null;
          token.idNumber = user.idNumber ?? null;
          token.idDOB = user.idDOB?.toISOString() ?? null;
          token.idExpiryDate = user.idExpiryDate?.toISOString() ?? null;
          token.idIssuer = user.idIssuer ?? null;
          token.personalIdNumber = user.personalIdNumber ?? null;
          token.idIssueDate = user.idIssueDate?.toISOString() ?? null;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? null;
        session.user.image = token.image ?? null;
        session.user.role = token.role as UserRole;
        session.user.isOtpVerified = token.isOtpVerified;
        session.user.otpCode = token.otpCode;
        session.user.otpExpiresAt = token.otpExpiresAt;
        session.user.isFaceVerified = token.isFaceVerified;

        if (token.role === UserRole.PROVIDER) {
          session.user.selfieImage = token.selfieImage;
          session.user.idImage = token.idImage;
          session.user.faceConfidence = token.faceConfidence;
          session.user.idName = token.idName;
          session.user.idNumber = token.idNumber;
          session.user.idDOB = token.idDOB;
          session.user.idExpiryDate = token.idExpiryDate;
          session.user.idIssuer = token.idIssuer;
          session.user.personalIdNumber = token.personalIdNumber;
          session.user.idIssueDate = token.idIssueDate;
        }
      }
      return session;
    },
  },
};

// Extend types for session and JWT
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: UserRole;
      isOtpVerified: boolean;
      otpCode?: string | null;
      otpExpiresAt?: string | null;
      isFaceVerified: boolean;
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
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole;
    isOtpVerified?: boolean | null;
    otpCode?: string | null;
    otpExpiresAt?: Date | null;
    isFaceVerified?: boolean | null;
    selfieImage?: string | null;
    idImage?: string | null;
    faceConfidence?: number | null;
    idName?: string | null;
    idNumber?: string | null;
    idDOB?: Date | null;
    idExpiryDate?: Date | null;
    idIssuer?: string | null;
    personalIdNumber?: string | null;
    idIssueDate?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole;
    isOtpVerified: boolean;
    otpCode?: string | null;
    otpExpiresAt?: string | null;
    isFaceVerified: boolean;
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
  }
}

export default NextAuth(authOptions);