import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
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

        return user;
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/",
    error: "/auth/error",
    newUser: "/role",
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
        domain: "bookloop-eight.vercel.app",
      },
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        if (!existingUser) return true; // Let them pick a role on first login

        if (!existingUser.isOtpVerified) {
          throw new Error("Phone verification required.");
        }

        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          throw new Error("Face verification required.");
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        if (!dbUser) {
          token.notRegistered = true;
          return token;
        }

        token = {
          ...token,
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image,
          role: dbUser.role,
          isOtpVerified: dbUser.isOtpVerified ?? true,
          otpCode: dbUser.otpCode ?? null,
          otpExpiresAt: dbUser.otpExpiresAt?.toISOString() ?? null,
          isFaceVerified: dbUser.isFaceVerified ?? false,
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

      // When session.update() is called from the client
      if (trigger === "update" && session) {
        token.role = session.role ?? token.role;
        token.isFaceVerified = session.isFaceVerified ?? token.isFaceVerified;

        if (session.verificationData) {
          token.selfieImage = session.verificationData.selfieImage ?? token.selfieImage;
          token.idImage = session.verificationData.idImage ?? token.idImage;
          token.faceConfidence = session.verificationData.faceConfidence ?? token.faceConfidence;
          token.idName = session.verificationData.idName ?? token.idName;
          token.idNumber = session.verificationData.idNumber ?? token.idNumber;
          token.idDOB = session.verificationData.idDOB ?? token.idDOB;
          token.idExpiryDate = session.verificationData.idExpiryDate ?? token.idExpiryDate;
          token.idIssuer = session.verificationData.idIssuer ?? token.idIssuer;
          token.personalIdNumber = session.verificationData.personalIdNumber ?? token.personalIdNumber;
          token.idIssueDate = session.verificationData.idIssueDate ?? token.idIssueDate;
        }

        // Optionally sync role update in DB
        if (session.role) {
          await prisma.user.update({
            where: { email: token.email ?? "" },
            data: { role: session.role },
          });
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user = {
          ...session.user,
          id: token.id as string,
          name: token.name,
          email: token.email,
          image: token.image,
          role: token.role,
          isOtpVerified: token.isOtpVerified,
          otpCode: token.otpCode,
          otpExpiresAt: token.otpExpiresAt,
          isFaceVerified: token.isFaceVerified,
          notRegistered: token.notRegistered ?? false,
          selfieImage: token.selfieImage ?? null,
          idImage: token.idImage ?? null,
          faceConfidence: token.faceConfidence ?? null,
          verificationData: {
            idName: token.idName ?? null,
            idNumber: token.idNumber ?? null,
            idDOB: token.idDOB ?? null,
            idExpiryDate: token.idExpiryDate ?? null,
            idIssuer: token.idIssuer ?? null,
            personalIdNumber: token.personalIdNumber ?? null,
            idIssueDate: token.idIssueDate ?? null,
          },
        };
      }

      return session;
    },
  },
};

export default NextAuth(authOptions);
