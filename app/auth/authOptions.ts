import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

// --- Extend NextAuth Types ---
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      role: UserRole;
      isOtpVerified: boolean;
      otpCode: string | null;
      otpExpiresAt: string | null;
      isFaceVerified: boolean;
      hasSelectedRole?: boolean; // Indicates if the user has explicitly selected a role
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
    role: UserRole;
    isOtpVerified: boolean;
    otpCode: string | null;
    otpExpiresAt: string | null;
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

// --- Authentication Options ---
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
          throw new Error("Missing credentials. Please provide both email and password.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials. User not found or password not set.");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials. Incorrect password.");
        }

        // Enforce face verification for PROVIDER role
        if (user.role === UserRole.PROVIDER && !user.isFaceVerified) {
          throw new Error("Face verification is required for Provider accounts. Please complete your verification.");
        }

        return user;
      },
    }),
  ],

  pages: {
    signIn: "/", // Custom sign-in page
    newUser: "/role", // Page for genuinely new users on their first sign-in
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh session every 24 hours
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development", // Enable debug mode in development

  callbacks: {
    // --- Sign In Callback ---
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email!;
        let existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Create new user if they don't exist
          // Assign a default role (e.g., CUSTOMER) and mark hasSelectedRole as false.
          // The user is now saved in the database.
          await prisma.user.create({
            data: {
              email,
              name: user.name ?? "",
              image: user.image ?? "",
              isOtpVerified: false,
              isFaceVerified: false,
              role: UserRole.CUSTOMER, // Default role for new Google sign-ups
              hasSelectedRole: false, // User still needs to explicitly select their final role
            },
          });
          // Crucially, return `true` here to allow the sign-in process to complete
          // and establish the session. Redirection will be handled by `pages.newUser`
          // or a custom middleware/client-side check.
          return true;
        }

        // If an existing user has no role set (e.g., from older data or initial Google signup
        // before role was mandatory), allow them to sign in.
        // The middleware or client-side logic will then redirect them to select a role.
        if (!existingUser.role) {
          return true;
        }

        // Prevent unverified PROVIDERs from logging in (this logic remains important for security)
        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          throw new Error("Face verification is required for Provider accounts. Please complete your verification.");
        }
      }

      // Allow all other sign-in attempts (e.g., credentials, or existing Google users who are fine)
      // Returning `true` here ensures the user is logged in and a session is established.
      return true;
    },

    // --- Redirect Callback ---
    async redirect({ url, baseUrl }) {
      // Allows relative urls to be redirected to
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl; // Fallback to base URL
    },

    // --- JWT Callback ---
    async jwt({ token, user, trigger, session }) {
      // Update the token if a session update trigger is detected and a role is provided
      if (trigger === "update" && session?.role) {
        token.role = session.role;
        // Persist the role update to the database
        await prisma.user.update({
          where: { email: token.email as string }, // Ensure email is treated as string
          data: { role: session.role },
        });
        // If the updated role is PROVIDER, reset face verification status
        if (session.role === UserRole.PROVIDER) {
          token.isFaceVerified = false;
        }
      }

      // On initial sign-in or session fetch, populate the token with user data
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.role = user.role;
        token.isOtpVerified = user.isOtpVerified ?? false; // Default to false if null/undefined
        token.otpCode = user.otpCode ?? null;
        token.otpExpiresAt = user.otpExpiresAt?.toISOString() ?? null;
        token.isFaceVerified = user.isFaceVerified ?? false; // Default to false if null/undefined
        token.hasSelectedRole = !!user.role; // Boolean representation of role selection

        // Include PROVIDER-specific fields only if the user is a PROVIDER
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

    // --- Session Callback ---
    async session({ session, token }) {
      // Populate session.user with data from the JWT token
      if (session.user) {
        session.user = {
          ...session.user,
          id: token.id,
          name: token.name ?? null,
          email: token.email ?? null,
          image: token.image ?? null,
          role: token.role,
          isOtpVerified: token.isOtpVerified,
          otpCode: token.otpCode,
          otpExpiresAt: token.otpExpiresAt,
          isFaceVerified: token.isFaceVerified,
          hasSelectedRole: token.hasSelectedRole,
          // Conditionally add PROVIDER-specific fields to the session
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