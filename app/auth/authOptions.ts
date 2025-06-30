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
        if (!user.isOtpVerified) throw new Error("Phone verification required");
        // Check if the user is a PROVIDER and if they are NOT face verified.
        // This check relies on the database's `isFaceVerified` status.
        if (user.role === UserRole.PROVIDER && !user.isFaceVerified) {
          throw new Error("Face verification required for providers");
        }
        if (!user.role) throw new Error("Missing account role");

        // Return the user object with relevant properties for the session
        return {
          ...user,
          // Ensure these properties are explicitly set for the session
          isOtpVerified: user.isOtpVerified ?? true,
          isFaceVerified: user.isFaceVerified ?? false,
        };
      },
    }),
  ],

  pages: {
    signIn: "/", // Redirect to home page for sign-in
    error: "/auth/error", // Custom error page
    newUser: null, // Prevent automatic redirect to /role for new users by NextAuth itself
  },

  session: {
    strategy: "jwt", // Use JWT for session management
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET, // JWT secret
  debug: process.env.NODE_ENV === "development", // Enable debug logs in development
  trustHost: true, // Trust the host for secure cookies

  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true, // Should be true in production
        domain: "bookloop-eight.vercel.app", // Your domain
      },
    },
  },

  callbacks: {
    // This callback is called when a user signs in.
    async signIn({ user, account }) {
      // Handle Google sign-in specific logic
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        // If no existing user, redirect to /role to allow them to complete their profile
        if (!existingUser) {
          // console.log(`Google signIn: No existing user found for ${user.email}. Redirecting to /role for registration flow.`); // Removed log
          return "/role"; // Explicitly redirect new Google users to /role
        }

        // --- START NEW LOGGING FOR EXISTING USERS --- (Removed logs)
        // console.log(`Google signIn: Found existing user ${existingUser.email}.`);
        // console.log(`  - Role: ${existingUser.role}`);
        // console.log(`  - isOtpVerified: ${existingUser.isOtpVerified}`);
        // console.log(`  - isFaceVerified: ${existingUser.isFaceVerified}`);
        // --- END NEW LOGGING ---

        // --- MODIFIED LOGIC HERE --- (Removed log)
        // If an existing user does not have a role defined, redirect them to /role
        // This check is now less critical here as the JWT callback will ensure a role is always present.
        if (!existingUser.role) {
          // console.log(`Google signIn: Existing user ${existingUser.email} has no role defined. Redirecting to /role.`); // Removed log
          return "/role";
        }
        // --- END MODIFIED LOGIC ---

        // If existing user is an ADMIN, allow sign-in
        if (existingUser.role === UserRole.ADMIN) {
          // console.log(`Google signIn: User is ADMIN. Allowing login.`); // Removed log
          return true;
        }

        // If user is not OTP verified, redirect to /verify
        if (!existingUser.isOtpVerified) {
          // console.log(`Google signIn: User ${existingUser.email} is not OTP verified. Redirecting to /verify.`); // Removed log
          return "/verify";
        }

        // If user is a PROVIDER and not face verified, redirect to /verify
        if (
          existingUser.role === UserRole.PROVIDER &&
          !existingUser.isFaceVerified
        ) {
          // console.log(`Google signIn: User ${existingUser.email} is PROVIDER but isFaceVerified is FALSE. Redirecting to /verify.`); // Removed log
          return "/verify";
        }

        // For all other cases (existing user with role, OTP verified, and face verified if PROVIDER), allow sign-in
        // console.log(`Google signIn: User ${existingUser.email} is fully verified and has a role. Allowing login to root.`); // Removed log
        return true;
      }

      // For non-Google providers, always allow sign-in if authorize passes
      return true;
    },

    // This callback is called whenever a JWT is created or updated.
    async jwt({ token, user, trigger, session }) {
      // Handle session updates (e.g., when a user updates their role)
      if (trigger === "update" && session?.role) {
        token.role = session.role; // Update role in token
        // Update user role in the database
        await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role },
        });

        // The problematic line that was resetting isFaceVerified was already removed.
      }

      // If a user object is provided (on initial sign-in), populate token with user data
      if (user) {
        token = {
          ...token,
          id: user.id,
          name: user.name,
          email: user.email,
          // Ensure role is always set, default to CUSTOMER if null/undefined from DB
          role: user.role ?? UserRole.CUSTOMER, // <-- ADDED DEFAULT ROLE HERE
          isOtpVerified: user.isOtpVerified ?? true,
          otpCode: user.otpCode ?? null,
          otpExpiresAt: user.otpExpiresAt?.toISOString() ?? null,
          isFaceVerified: user.isFaceVerified ?? false, // Ensure this reflects the actual DB status
          // Include PROVIDER-specific data if the role is PROVIDER
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
        // Also ensure image is set from user object if available
        if (user.image) {
            token.image = user.image;
        }
      }

      return token;
    },

    // This callback is called whenever a session is checked.
    async session({ session, token }) {
      // If session user exists, populate it with data from the token
      if (session.user) {
        session.user = {
          ...session.user,
          id: token.id as string,
          name: token.name ?? null,
          email: token.email ?? null,
          image: token.image ?? null,
          role: token.role as UserRole,
          isOtpVerified: token.isOtpVerified,
          otpCode: token.otpCode,
          otpExpiresAt: token.otpExpiresAt,
          isFaceVerified: token.isFaceVerified, // Ensure this is correctly passed
          // Include PROVIDER-specific data in the session if the role is PROVIDER
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
