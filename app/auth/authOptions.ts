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
      requiresRoleSelection: boolean; // New field to track if role selection is needed
      // ... other fields remain the same
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
    requiresRoleSelection: boolean; // New field
    // ... other fields remain the same
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
    // Remove newUser redirect as we'll handle it in callbacks
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email!;
        let existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          existingUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? "",
              image: user.image ?? "",
              isOtpVerified: false,
              isFaceVerified: false,
              role: null, // User selects role later
            },
          });
        }

        // Attach all DB fields to `user` so `jwt()` gets them
        Object.assign(user, existingUser);

        // No return redirect here - we'll handle it in redirect callback
      }

      return true;
    },

    async redirect({ url, baseUrl, token }) {
      // Handle role selection redirect
      if (token?.requiresRoleSelection && !url.includes("/role")) {
        return `${baseUrl}/role`;
      }

      // Default redirect handling
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.name = user.name ?? null;
        token.email = user.email ?? null;
        token.image = user.image ?? null;
        token.role = user.role ?? null;
        token.isOtpVerified = user.isOtpVerified ?? false;
        token.isFaceVerified = user.isFaceVerified ?? false;
        token.requiresRoleSelection = !user.role; // Set flag based on whether role is set
        
        // ... (keep your existing provider-specific fields)
      }

      // Handle role updates
      if (trigger === "update" && session?.role) {
        token.role = session.role as UserRole;
        token.requiresRoleSelection = false; // Role selected, no longer requires selection
        
        await prisma.user.update({
          where: { email: token.email ?? "" },
          data: { role: session.role as UserRole },
        });
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user = {
          id: token.id,
          name: token.name ?? null,
          email: token.email ?? null,
          image: token.image ?? null,
          role: token.role ?? null,
          isOtpVerified: token.isOtpVerified,
          isFaceVerified: token.isFaceVerified,
          requiresRoleSelection: token.requiresRoleSelection,
          // ... (keep your existing provider-specific fields)
        };
      }

      return session;
    },
  },
};

export default NextAuth(authOptions);