import NextAuth, { AuthOptions, DefaultSession, User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/app/libs/prismadb";
import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";

// It's good practice to extend the NextAuth types for better type safety
// You would typically put this in a file like 'next-auth.d.ts' in your project root
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
    } & DefaultSession["user"];
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

// Ensure environment variables are defined, or your app will crash in production.
// It's highly recommended to validate these at application startup.
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error("GOOGLE_CLIENT_ID is not defined in environment variables.");
  // Consider throwing an error or exiting the process in a real application
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error("GOOGLE_CLIENT_SECRET is not defined in environment variables.");
}
if (!process.env.NEXTAUTH_SECRET) {
  console.error("NEXTAUTH_SECRET is not defined in environment variables.");
}


export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!, // '!' asserts non-null, but runtime check above is safer
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!, // '!' asserts non-null
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // Added 'req' parameter to the signature and explicitly defined the return type
      async authorize(credentials, req): Promise<NextAuthUser | null> {
        // Check for missing credentials
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials"); // NextAuth will redirect to signIn page with error param
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // Check if user exists and has a hashed password
        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials"); // Generic error for security (don't reveal if email exists)
        }

        // Compare provided password with hashed password
        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials"); // Generic error for security
        }

        // Specific check for PROVIDER role requiring face verification
        if (user.role === UserRole.PROVIDER && !user.isFaceVerified) {
          // Corrected: Removed the extra 'new' keyword
          throw new Error("Face verification required for providers"); // This error will be displayed
        }

        // Ensure user has a role assigned
        if (!user.role) {
          throw new Error("Missing account role");
        }

        // Return a new object with only the properties expected by NextAuth's User interface
        // and your custom extended Session['user'] type.
        // DO NOT return sensitive fields like hashedPassword directly.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image as string | null, // Explicitly cast image to string | null
          role: user.role,
          isOtpVerified: user.isOtpVerified ?? true,
          otpCode: user.otpCode ?? null,
          otpExpiresAt: user.otpExpiresAt?.toISOString() ?? null,
          isFaceVerified: user.isFaceVerified ?? false,
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
        };
      },
    }),
  ],

  pages: {
    signIn: "/", // Custom sign-in page
    newUser: "/role", // Page for new users to select their role
  },

  session: {
    strategy: "jwt", // Use JWT for session management
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days, matches session maxAge
  },

  secret: process.env.NEXTAUTH_SECRET, // Secret for signing/encrypting JWTs
  debug: process.env.NODE_ENV === "development", // Enable debug logs in development

  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production", // ❗ secure only in prod
        domain:
          process.env.NODE_ENV === "production"
            ? "bookloop-eight.vercel.app"
            : undefined, // ❗ allow local dev
      },
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      // Logic specific to Google sign-in
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
          select: { role: true, isFaceVerified: true } // Select only necessary fields
        });

        if (!existingUser) {
          // If it's a new Google user, redirect them to the role selection page
          return '/role';
        }

        // If existing user is a PROVIDER and not face verified, prevent sign-in
        if (existingUser.role === UserRole.PROVIDER && !existingUser.isFaceVerified) {
          throw new Error("Face verification required."); // This error will be displayed
        }

        // Allow sign-in for existing users
        return true;
      }
      // For other providers (e.g., Credentials), always allow sign-in if authorize succeeded
      return true;
    },

    async redirect({ url, baseUrl }) {
      // Allow redirects to relative paths or same-origin URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      // Fallback to base URL for external or malicious redirects
      return baseUrl;
    },

    async jwt({ token, user, trigger, session }) {
      // Update token properties if triggered by a session update (e.g., useSession().update())
      if (trigger === "update" && session?.role) {
        token.role = session.role;

        // Persist role update to the database
        await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role },
        });

        // If role is updated to PROVIDER, reset face verification status
        if (session.role === UserRole.PROVIDER) {
          token.isFaceVerified = false;
        }
      }

      // Populate token with user data on initial sign-in
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image as string | null; // Explicitly cast image to string | null
        token.role = user.role;
        token.isOtpVerified = user.isOtpVerified ?? true;
        token.otpCode = user.otpCode ?? null;
        // Convert Date objects to ISO strings for consistent storage in JWT
        token.otpExpiresAt = user.otpExpiresAt?.toISOString() ?? null;
        token.isFaceVerified = user.isFaceVerified ?? false;

        // Add provider-specific fields if the user is a PROVIDER
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
      // Map token properties to the session.user object, making them available client-side
      if (session.user) {
        session.user = {
          ...session.user, // Keep default NextAuth user properties
          id: token.id as string,
          name: token.name ?? null,
          email: token.email ?? null,
          image: token.image ?? null,
          role: token.role as UserRole,
          isOtpVerified: token.isOtpVerified,
          otpCode: token.otpCode,
          otpExpiresAt: token.otpExpiresAt,
          isFaceVerified: token.isFaceVerified,
          // Conditionally add provider-specific fields
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
