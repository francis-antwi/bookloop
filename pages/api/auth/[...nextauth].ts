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
    error: "/auth/",
    verifyRequest: "/auth/verify-request",
    newUser: "/role", // optional override
  },
  session: {
    strategy: "jwt",
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
          // Fix: Provide required role ("CUSTOMER") to satisfy schema
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name ?? "",
              image: user.image ?? "",
              isOtpVerified: true,
              isFaceVerified: false,
              role: "CUSTOMER", // Required by schema
            },
          });

          // Still ask them to confirm or switch role
          return "/auth/?error=ROLE_SELECTION_REQUIRED";
        }

        if (!existingUser.role) {
          return "/auth/?error=ROLE_SELECTION_REQUIRED";
        }

        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          return "/auth/?error=PROVIDER_VERIFICATION_REQUIRED";
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
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

export default NextAuth(authOptions);
