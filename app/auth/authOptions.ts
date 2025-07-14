// ============================
// ✅ NextAuth Configuration
// ============================

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
          throw new Error("MISSING_CREDENTIALS");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("INVALID_CREDENTIALS");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isCorrectPassword) throw new Error("INVALID_CREDENTIALS");

        // 🚫 BLOCK unverified PROVIDERs
        if (user.role === UserRole.PROVIDER && !user.verified) {
          throw new Error("NOT_VERIFIED");
        }

        // 🚫 BLOCK providers not face verified
        if (user.role === UserRole.PROVIDER && !user.isFaceVerified) {
          throw new Error("FACE_VERIFICATION_REQUIRED");
        }

        if (!user.role) throw new Error("MISSING_ROLE");

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          isOtpVerified: user.isOtpVerified ?? true,
          isFaceVerified: user.isFaceVerified ?? false,
          verified: user.verified ?? false,
        };
      },
    }),
  ],

  pages: {
    signIn: "/",
    error: "/auth/error",
    newUser: "/role",
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

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // BLOCK unverified PROVIDERs
        if (existingUser?.role === "PROVIDER") {
          if (!existingUser.verified || !existingUser.isFaceVerified) {
            console.warn("🛑 PROVIDER not verified. Blocking sign in.");
            return false; // Deny login
          }
        }

        // Create if not exists
        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? "",
              image: user.image ?? null,
              isOtpVerified: false,
              isFaceVerified: false,
              verified: false,
            },
          });
        }
      }

      return true;
    },


    async jwt({ token, user, trigger, session }) {
      // 🎯 Handle role update from session
      if (trigger === "update" && session?.role) {
        token.role = session.role;
        await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role },
        });

        if (session.role === UserRole.PROVIDER) {
          token.isFaceVerified = false;
          token.verified = false;
        }
      }

      // 🧠 Populate token with DB user info
      if (user?.email || token?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user?.email ?? (token.email as string) },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            isOtpVerified: true,
            isFaceVerified: true,
            verified: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name ?? "";
          token.email = dbUser.email;
          token.image = dbUser.image ?? null;
          token.role = dbUser.role;
          token.isOtpVerified = dbUser.isOtpVerified ?? false;
          token.isFaceVerified = dbUser.isFaceVerified ?? false;
          token.verified = dbUser.verified ?? false;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user = {
          id: token.id as string,
          name: token.name ?? null,
          email: token.email ?? null,
          image: token.image ?? null,
          role: token.role as UserRole,
          isOtpVerified: token.isOtpVerified ?? false,
          isFaceVerified: token.isFaceVerified ?? false,
          verified: token.verified ?? false,
        };
      }

      return session;
    },
  
  },

  events: {
    async signIn({ user, account }) {
      console.log("✅ User signed in:", {
        user: user.email,
        provider: account?.provider,
      });
    },
    async signOut({ token }) {
      console.log("👋 User signed out:", token?.email);
    },
    async session({ session }) {
      if (process.env.NODE_ENV === "development") {
        console.log("📦 Session accessed:", {
          user: session.user?.email,
          role: session.user?.role,
          verified: session.user?.verified,
          expires: session.expires,
        });
      }
    },
  },
};

export default NextAuth(authOptions);
