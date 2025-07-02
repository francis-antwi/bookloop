import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
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

        if (user.role === UserRole.PROVIDER && !user.isFaceVerified) {
          throw new Error("Face verification required for providers");
        }

        return user;
      },
    }),
  ],

  pages: {
    signIn: "/",         // Login page
    newUser: "/role",    // Redirect new users to role selection
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        if (!existingUser) {
          // Create user with placeholder role (required for DB schema)
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name ?? "",
              image: user.image ?? "",
              isOtpVerified: false,
              isFaceVerified: false,
              role: UserRole.CUSTOMER, // Temp default
            },
          });

          return "/role"; // Redirect to role selector
        }

        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          return "/verify"; // Force verification for unverified providers
        }

        return true;
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Populate token on first sign-in
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.role = user.role;
        token.isOtpVerified = user.isOtpVerified ?? false;
        token.isFaceVerified = user.isFaceVerified ?? false;
      }

      // Allow dynamic role updates via session.update()
      if (trigger === "update" && session?.role) {
        const updatedUser = await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role },
        });

        token.role = updatedUser.role;
        token.isFaceVerified = updatedUser.isFaceVerified;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? null;
        session.user.image = token.image ?? null;
        session.user.role = token.role as UserRole;
        session.user.isOtpVerified = token.isOtpVerified ?? false;
        session.user.isFaceVerified = token.isFaceVerified ?? false;
      }

      return session;
    },
  },
};

export default NextAuth(authOptions);
