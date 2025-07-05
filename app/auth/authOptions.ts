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

        const isCorrectPassword = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!isCorrectPassword) throw new Error("INVALID_CREDENTIALS");

        if (!user.isOtpVerified) throw new Error("PHONE_VERIFICATION_REQUIRED");
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // every 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  trustHost: true,

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        if (!existingUser) return "/auth/error?error=redirect-role";
        if (!existingUser.role) return "/auth/error?error=redirect-role";
        if (!existingUser.isOtpVerified) return "/auth/error?error=redirect-verify";
        if (existingUser.role === "PROVIDER" && !existingUser.isFaceVerified) {
          return "/auth/error?error=redirect-verify";
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.role) {
        token.role = session.role;

        // Update user role in DB if needed
        await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role },
        });

        if (session.role === UserRole.PROVIDER) {
          token.isFaceVerified = false;
        }
      }

      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser) {
          token = {
            ...token,
            id: dbUser.id,
            name: dbUser.name ?? "",
            email: dbUser.email,
            image: dbUser.image ?? null,
            role: dbUser.role,
            isOtpVerified: dbUser.isOtpVerified ?? true,
            isFaceVerified: dbUser.isFaceVerified ?? false,
          };
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
          isOtpVerified: token.isOtpVerified ?? true,
          isFaceVerified: token.isFaceVerified ?? false,
        };
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
