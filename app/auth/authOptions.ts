import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";
import jwt from 'jsonwebtoken';

// --- JWT Configuration ---
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '15m'; // Short-lived token

// --- Type Extensions ---
declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole | null;
    isOtpVerified: boolean;
    isFaceVerified: boolean;
    requiresRoleSelection?: boolean;
  }
  
  interface Account {}
  interface Profile {}
}

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
      async authorize(credentials, req) {
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isOtpVerified: user.isOtpVerified,
          isFaceVerified: user.isFaceVerified,
          requiresRoleSelection: !user.role
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes (matches JWT expiry)
  },

  jwt: {
    secret: JWT_SECRET,
    maxAge: 15 * 60, // 15 minutes
    async encode({ secret, token }) {
      return jwt.sign(token!, secret, { expiresIn: JWT_EXPIRES_IN });
    },
    async decode({ secret, token }) {
      try {
        return jwt.verify(token!, secret) as any;
      } catch (e) {
        return null;
      }
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email!;
        let existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          existingUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? "",
              image: user.image ?? "",
              isOtpVerified: false,
              isFaceVerified: false,
              role: null,
            },
          });
        }

        Object.assign(user, {
          id: existingUser.id,
          role: existingUser.role,
          isOtpVerified: existingUser.isOtpVerified,
          isFaceVerified: existingUser.isFaceVerified,
          requiresRoleSelection: !existingUser.role
        });
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.isOtpVerified = user.isOtpVerified;
        token.isFaceVerified = user.isFaceVerified;
        token.requiresRoleSelection = user.requiresRoleSelection;
      }

      // Handle role updates
      if (trigger === "update" && session?.role) {
        token.role = session.role as UserRole;
        token.requiresRoleSelection = false;
        
        await prisma.user.update({
          where: { id: token.id as string },
          data: { role: session.role as UserRole },
        });
      }

      return token;
    },

    async session({ session, token }) {
      // Send minimal required properties to the client
      session.user = {
        id: token.id as string,
        email: token.email as string,
        name: token.name as string | null,
        role: token.role as UserRole | null,
        isOtpVerified: token.isOtpVerified as boolean,
        isFaceVerified: token.isFaceVerified as boolean,
        requiresRoleSelection: token.requiresRoleSelection as boolean,
      };
      
      // Add the JWT token to the session
      session.token = jwt.sign(
        {
          sub: token.id,
          email: token.email,
          role: token.role,
          requiresRoleSelection: token.requiresRoleSelection
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return session;
    },

    async redirect({ url, baseUrl, token }) {
      // Handle role selection redirect
      if (token?.requiresRoleSelection && !url.includes("/role")) {
        return `${baseUrl}/role`;
      }

      // Default redirect handling
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  events: {
    async signOut() {
      // Add any cleanup logic for JWT tokens here
    },
  },
};

export default NextAuth(authOptions);