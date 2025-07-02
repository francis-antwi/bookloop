import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

// --- Extend types ---
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      role: UserRole | null;
      isOtpVerified: boolean;
      isFaceVerified: boolean;
      hasSelectedRole?: boolean;
      selfieImage?: string | null;
      idImage?: string | null;
      faceConfidence?: number | null;
      idName?: string | null;
      idNumber?: string | null;
      idDOB?: string | null;
      idExpiryDate?: string | null;
      idIssuer?: string | null;
      personalIdNumber?: string | null;
      idIssueDate?: string | null;
    };
  }

  interface JWT {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: UserRole | null;
    isOtpVerified: boolean;
    isFaceVerified: boolean;
    hasSelectedRole?: boolean;
    selfieImage?: string | null;
    idImage?: string | null;
    faceConfidence?: number | null;
    idName?: string | null;
    idNumber?: string | null;
    idDOB?: string | null;
    idExpiryDate?: string | null;
    idIssuer?: string | null;
    personalIdNumber?: string | null;
    idIssueDate?: string | null;
  }
}

// --- Auth Options ---
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

        const isCorrectPassword = await bcrypt.compare(credentials.password, user.hashedPassword);

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        return user;
      },
    }),
  ],

  pages: {
    signIn: "/",
    newUser: "/role", // Not strictly necessary since we redirect manually
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

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email!;
        let existingUser = await prisma.user.findUnique({ where: { email } });

        if (!existingUser) {
          // Save new Google user
          existingUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? "",
              image: user.image ?? "",
              isOtpVerified: false,
              isFaceVerified: false,
              role: null, // 👈 will select later
            },
          });
          return "/role"; // Redirect to select role
        }

        // Redirect users who haven't selected a role
        if (!existingUser.role) {
          return "/role";
        }

        return true;
      }

      return true;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.role) {
        token.role = session.role as UserRole;
        await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role as UserRole },
        });
      }

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.role = user.role;
        token.isOtpVerified = user.isOtpVerified ?? false;
        token.isFaceVerified = user.isFaceVerified ?? false;
        token.hasSelectedRole = !!user.role;

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
        session.user = {
          ...session.user,
          id: token.id,
          name: token.name ?? null,
          email: token.email ?? null,
          image: token.image ?? null,
          role: token.role ?? null,
          isOtpVerified: token.isOtpVerified,
          isFaceVerified: token.isFaceVerified,
          hasSelectedRole: token.hasSelectedRole,
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

      return session;
    },
  },
};

export default NextAuth(authOptions);
