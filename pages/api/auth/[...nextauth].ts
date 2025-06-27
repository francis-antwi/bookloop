import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/app/libs/prismadb";
import bcrypt from "bcrypt";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
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

        return user;
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  callbacks: {
    async signIn({ user }) {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email || "" },
      });

      if (!existingUser) {
        throw new Error("You must complete face verification before creating an account.");
      }

      if (!existingUser.role) {
        throw new Error("You must select your role (Customer or Provider) before signing in.");
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.isFaceVerified = (user as any).isFaceVerified;
        token.selfieImage = (user as any).selfieImage;
        token.idImage = (user as any).idImage;
        token.faceConfidence = (user as any).faceConfidence;

        // ✅ Extracted ID data
        token.idName = (user as any).idName;
        token.idNumber = (user as any).idNumber;
        token.idDOB = (user as any).idDOB;
        token.idExpiryDate = (user as any).idExpiryDate;
        token.idIssuer = (user as any).idIssuer;

        // ✅ NEW FIELDS
        token.personalIdNumber = (user as any).personalIdNumber;
        token.idIssueDate = (user as any).idIssueDate;

        // ✅ OTP fields
        token.isOtpVerified = (user as any).isOtpVerified;
        token.otpCode = (user as any).otpCode ?? null;
        token.otpExpiresAt = (user as any).otpExpiresAt
          ? new Date((user as any).otpExpiresAt).toISOString()
          : null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.isFaceVerified = token.isFaceVerified;
        session.user.selfieImage = token.selfieImage;
        session.user.idImage = token.idImage;
        session.user.faceConfidence = token.faceConfidence;

        // ✅ ID fields
        session.user.idName = token.idName;
        session.user.idNumber = token.idNumber;
        session.user.idDOB = token.idDOB;
        session.user.idExpiryDate = token.idExpiryDate;
        session.user.idIssuer = token.idIssuer;

        // ✅ NEW FIELDS
        session.user.personalIdNumber = token.personalIdNumber;
        session.user.idIssueDate = token.idIssueDate;

        // ✅ OTP fields
        session.user.isOtpVerified = token.isOtpVerified;
        session.user.otpCode = token.otpCode;
        session.user.otpExpiresAt = token.otpExpiresAt;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
