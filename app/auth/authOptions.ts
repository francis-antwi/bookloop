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
          throw new Error("Phone verification is required.");
        }

        if (user.role === UserRole.PROVIDER && !user.isFaceVerified) {
          throw new Error("Face verification required for providers.");
        }

        if (!user.role) {
          throw new Error("Account is missing a role.");
        }

        return user;
      },
    }),
  ],

  pages: {
    signIn: "/",
    newUser: null, // ❌ prevent PrismaAdapter from auto-creating Google users
    error: "/auth",
  },

  session: {
    strategy: "jwt",
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        // 🟡 User signed in for the first time, no user exists in DB
        if (!existingUser) {
          return `/role?email=${encodeURIComponent(user.email ?? "")}`;
        }

        // 🔴 User exists but has no role set yet
        if (!existingUser.role) {
          return `/role?email=${encodeURIComponent(user.email ?? "")}`;
        }

        // 🔒 Providers must be verified before login
        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          return `/verify?email=${encodeURIComponent(user.email ?? "")}`;
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.role = user.role ?? null;
      }

      // If session update manually sets role
      if (trigger === "update" && session?.role) {
        token.role = session.role;

        await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role },
        });
      }

      return token;
    },

    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id,
        email: token.email,
        name: token.name,
        image: token.image,
        role: token.role ?? null,
      };
      return session;
    },
  },
};

export default NextAuth(authOptions);
