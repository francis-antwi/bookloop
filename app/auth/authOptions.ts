import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

// Default role for new users
const DEFAULT_USER_ROLE = UserRole.USER;

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

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        if (!isValid) throw new Error("INVALID_CREDENTIALS");

        // Temporary provider login exception
        if (
          user.role === UserRole.PROVIDER &&
          (!user.verified || user.requiresApproval || !user.isFaceVerified)
        ) {
          console.warn("🟡 PROVIDER not fully verified - allowing login");
        }

        // Ensure user has a role
        const userRole = user.role || DEFAULT_USER_ROLE;
        if (!user.role) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: DEFAULT_USER_ROLE },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: userRole,
          isOtpVerified: user.isOtpVerified ?? false,
          isFaceVerified: user.isFaceVerified ?? false,
          verified: user.verified ?? false,
          requiresApproval: user.requiresApproval ?? false,
          businessVerified: user.businessVerified ?? false,
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
    updateAge: 24 * 60 * 60, // 24 hours
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? "",
              image: user.image ?? null,
              role: DEFAULT_USER_ROLE,
              verified: false,
              isFaceVerified: false,
              requiresApproval: false,
              businessVerified: false,
            },
          });
        } else if (!existingUser.role) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { role: DEFAULT_USER_ROLE },
          });
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Handle role updates
      if (trigger === "update" && session?.role) {
        token.role = session.role;
        await prisma.user.update({
          where: { email: token.email! },
          data: { role: session.role },
        });
      }

      // Initial sign-in
      if (user) {
        token = {
          ...token,
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          isOtpVerified: user.isOtpVerified,
          isFaceVerified: user.isFaceVerified,
          verified: user.verified,
          requiresApproval: user.requiresApproval,
          businessVerified: user.businessVerified,
        };
      }

      // Always refresh critical fields from database
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: {
            role: true,
            verified: true,
            isFaceVerified: true,
            requiresApproval: true,
            businessVerified: true,
          },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.verified = dbUser.verified;
          token.isFaceVerified = dbUser.isFaceVerified;
          token.requiresApproval = dbUser.requiresApproval;
          token.businessVerified = dbUser.businessVerified;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user = {
          ...session.user,
          id: token.id as string,
          name: token.name as string,
          email: token.email as string,
          image: token.image as string | null,
          role: token.role as UserRole,
          isOtpVerified: token.isOtpVerified as boolean,
          isFaceVerified: token.isFaceVerified as boolean,
          verified: token.verified as boolean,
          requiresApproval: token.requiresApproval as boolean,
          businessVerified: token.businessVerified as boolean,
        };
      }
      return session;
    },
  },

  events: {
    async signIn({ user, account }) {
      console.log(
        `✅ ${user.role || "NO_ROLE"} signed in:`,
        user.email,
        "via",
        account?.provider
      );
    },
    async signOut({ token }) {
      console.log("👋 Signed out:", token?.email);
    },
    async session({ session }) {
      if (process.env.NODE_ENV === "development") {
        console.log("📦 Session:", {
          email: session.user?.email,
          role: session.user?.role,
          verified: session.user?.verified,
          requiresApproval: session.user?.requiresApproval,
          businessVerified: session.user?.businessVerified,
        });
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  trustHost: true,
};

export default NextAuth(authOptions);