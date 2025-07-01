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
        if (!user.role) throw new Error("Missing account role");

        if (user.role === UserRole.PROVIDER && !user.isFaceVerified) {
          throw new Error("Face verification required for providers");
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
  trustHost: true,
  debug: process.env.NODE_ENV === "development",

  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        // Dynamically set the domain for the session cookie
        // This is crucial for local development and Vercel preview deployments
        // If VERCEL_URL is present, use its hostname. Otherwise, let NextAuth.js handle it (e.g., for localhost).
        domain: process.env.VERCEL_URL ? new URL(`https://${process.env.VERCEL_URL}`).hostname : undefined,
      },
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { role: true, isFaceVerified: true },
        });

        if (!existingUser) return "/role";
        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          throw new Error("Face verification required.");
        }
      }
      return true;
    },

    async jwt({ token, user, account, profile, trigger, session }) {
      if (user) {
        token = {
          ...token,
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isOtpVerified: user.isOtpVerified ?? true,
          otpCode: user.otpCode ?? null,
          otpExpiresAt: user.otpExpiresAt?.toISOString() ?? null,
          isFaceVerified: user.isFaceVerified ?? false,
          ...(user.role === UserRole.PROVIDER && {
            selfieImage: user.selfieImage ?? null,
            idImage: user.idImage ?? null,
            faceConfidence: user.faceConfidence ?? null,
            idName: user.idName ?? null,
            idNumber: user.idNumber ?? null,
            idDOB: user.idDOB?.toISOString() ?? null,
            idExpiryDate: user.idExpiryDate?.toISOString() ?? null,
            idIssuer: user.idIssuer ?? null,
            personalIdNumber: user.personalIdNumber ?? null,
            idIssueDate: user.idIssueDate?.toISOString() ?? null,
          }),
        };
      }

      // Rehydrate missing token data
      if (!token.role || token.isFaceVerified === undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email ?? "" },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.isFaceVerified = dbUser.isFaceVerified ?? false;
          token.isOtpVerified = dbUser.isOtpVerified ?? true;
        }
      }

      // Handle manual role updates
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
          email: token.email ?? null,
          name: token.name ?? null,
          image: token.image ?? null,
          role: token.role as UserRole,
          isOtpVerified: token.isOtpVerified,
          otpCode: token.otpCode,
          otpExpiresAt: token.otpExpiresAt,
          isFaceVerified: token.isFaceVerified,
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

      if (process.env.NODE_ENV === "development") {
        console.log("[SESSION CALLBACK]", session);
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};

export default NextAuth(authOptions);
