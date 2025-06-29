import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/app/libs/prismadb";
import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";

export const authOptions: AuthOptions = {
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

        if (!isCorrectPassword) throw new Error("Invalid credentials");
        if (!user.isOtpVerified) throw new Error("Phone verification required");
        if (user.role === UserRole.PROVIDER && !user.isFaceVerified) {
          throw new Error("Face verification required for providers");
        }
        if (!user.role) throw new Error("Missing account role");

        return {
          ...user,
          isOtpVerified: user.isOtpVerified ?? true,
          isFaceVerified: user.isFaceVerified ?? false,
        };
      },
    }),
  ],

  pages: {
    signIn: "/", // Login page
    error: "/auth/error",
    newUser: "/role", // New Google users redirected here
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  trustHost: true,

  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: "bookloop-eight.vercel.app", // Adjust for your domain
      },
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        if (!existingUser) {
          // Let user in to select role, but prevent access elsewhere
          return true;
        }

        if (!existingUser.isOtpVerified) {
          throw new Error("Phone verification required.");
        }

        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          throw new Error("Face verification required.");
        }

        return true;
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        if (!existingUser) {
          token.notRegistered = true; // Mark as pending user
          return token;
        }

        token = {
          ...token,
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          image: existingUser.image,
          role: existingUser.role,
          isOtpVerified: existingUser.isOtpVerified ?? true,
          otpCode: existingUser.otpCode ?? null,
          otpExpiresAt: existingUser.otpExpiresAt?.toISOString() ?? null,
          isFaceVerified: existingUser.isFaceVerified ?? false,
          ...(existingUser.role === UserRole.PROVIDER && {
            selfieImage: existingUser.selfieImage ?? null,
            idImage: existingUser.idImage ?? null,
            faceConfidence: existingUser.faceConfidence ?? null,
            idName: existingUser.idName ?? null,
            idNumber: existingUser.idNumber ?? null,
            idDOB: existingUser.idDOB?.toISOString() ?? null,
            idExpiryDate: existingUser.idExpiryDate?.toISOString() ?? null,
            idIssuer: existingUser.idIssuer ?? null,
            personalIdNumber: existingUser.personalIdNumber ?? null,
            idIssueDate: existingUser.idIssueDate?.toISOString() ?? null,
          }),
        };
      }

      // Role updates (e.g., after selecting role)
      if (trigger === "update" && session?.role) {
        token.role = session.role;

        await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role },
        });

        if (session.role === UserRole.PROVIDER) {
          token.isFaceVerified = false;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user = {
          ...session.user,
          id: token.id as string,
          name: token.name ?? null,
          email: token.email ?? null,
          image: token.image ?? null,
          role: token.role as UserRole,
          isOtpVerified: token.isOtpVerified,
          otpCode: token.otpCode,
          otpExpiresAt: token.otpExpiresAt,
          isFaceVerified: token.isFaceVerified,
          notRegistered: token.notRegistered ?? false,
          ...(token.role === UserRole.PROVIDER && {
            selfieImage: token.selfieImage,
            idImage: token.idImage,
            faceConfidence: token.faceConfidence,
            idName: token.idName,
            idNumber: token.idNumber,
            idDOB: token.idDOB,
            idExpiryDate: token.idExpiryDate,
            idIssuer: token.idIssuer,
            personalIdNumber: token.personalIdNumber,
            idIssueDate: token.idIssueDate,
          }),
        };
      }

      return session;
    },
  },
};

export default NextAuth(authOptions);
