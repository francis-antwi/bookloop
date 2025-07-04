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
        domain:
          process.env.NODE_ENV === "production"
            ? "bookloop-eight.vercel.app"
            : undefined,
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
          return "/auth/error?error=redirect-role";
        }

        if (
          existingUser.role &&
          existingUser.isOtpVerified &&
          (existingUser.role !== UserRole.PROVIDER || existingUser.isFaceVerified)
        ) {
          return "/";
        }

        if (!existingUser.role) {
          return "/auth/error?error=redirect-role";
        }

        if (!existingUser.isOtpVerified) {
          return "/auth/error?error=redirect-verify";
        }

        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          return "/auth/error?error=redirect-verify";
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.role && session.role !== token.role) {
        token.role = session.role;

        await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role },
        });

        if (session.role === UserRole.PROVIDER) {
          token.isFaceVerified = false;
        }
      }

      if (user && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (dbUser) {
          token = {
            ...token,
            id: dbUser.id,
            name: dbUser.name ?? "",
            email: dbUser.email ?? "",
            image: dbUser.image ?? null,
            role: dbUser.role ?? null,
            isOtpVerified: dbUser.isOtpVerified ?? true,
            isFaceVerified: dbUser.isFaceVerified ?? false,
            otpCode: dbUser.otpCode ?? null,
            otpExpiresAt: dbUser.otpExpiresAt?.toISOString() ?? null,
          };

          if (dbUser.role === UserRole.PROVIDER) {
            token = {
              ...token,
              selfieImage: dbUser.selfieImage ?? null,
              idImage: dbUser.idImage ?? null,
              faceConfidence: dbUser.faceConfidence ?? null,
              idName: dbUser.idName ?? null,
              idNumber: dbUser.idNumber ?? null,
              idDOB: dbUser.idDOB?.toISOString() ?? null,
              idExpiryDate: dbUser.idExpiryDate?.toISOString() ?? null,
              idIssuer: dbUser.idIssuer ?? null,
              personalIdNumber: dbUser.personalIdNumber ?? null,
              idIssueDate: dbUser.idIssueDate?.toISOString() ?? null,
            };
          }
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
          otpCode: token.otpCode ?? null,
          otpExpiresAt: token.otpExpiresAt ?? null,
          selfieImage: token.selfieImage ?? null,
          idImage: token.idImage ?? null,
          faceConfidence: token.faceConfidence ?? null,
          idName: token.idName ?? null,
          idNumber: token.idNumber ?? null,
          idDOB: token.idDOB ?? null,
          idExpiryDate: token.idExpiryDate ?? null,
          idIssuer: token.idIssuer ?? null,
          personalIdNumber: token.personalIdNumber ?? null,
          idIssueDate: token.idIssueDate ?? null,
        };
      }

      return session;
    },
  },
};

export default NextAuth(authOptions);