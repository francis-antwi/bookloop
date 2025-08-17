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
        email:    { label: "Email", type: "text" },
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

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!isValid) throw new Error("INVALID_CREDENTIALS");

       // 🟡 Temporarily allow provider login for verification flow
if (
  user.role === UserRole.PROVIDER &&
  (!user.verified || user.requiresApproval || !user.isFaceVerified)
) {
  console.warn("🟡 PROVIDER not fully verified. Allowing login for verification flow.");
}


        if (!user.role) throw new Error("MISSING_ROLE");

        return {
          id:               user.id,
          name:             user.name,
          email:            user.email,
          image:            user.image,
          role:             user.role,
          isOtpVerified:    user.isOtpVerified   ?? false,
          isFaceVerified:   user.isFaceVerified  ?? false,
          verified:         user.verified        ?? false,
          requiresApproval: user.requiresApproval?? false,
          businessVerified: user.businessVerified?? false,
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

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const db = await prisma.user.findUnique({ where: { email: user.email } });

        // // ✅ Optionally enforce provider gatekeeping via Google
        // if (
        //   db?.role === UserRole.PROVIDER &&
        //   (!db.verified || db.requiresApproval || !db.isFaceVerified)
        // ) {
        //   console.warn("🛑 PROVIDER not approved – Google login blocked.");
        //   return false;
        // }

        if (!db) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? "",
              image: user.image ?? null,
              role: null,
              verified: false,
              isFaceVerified: false,
              requiresApproval: false,
              businessVerified: false,
            },
          });
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.role) {
        token.role = session.role;
        await prisma.user.update({
          where: { email: token.email! },
          data: { role: session.role },
        });

        if (session.role === UserRole.PROVIDER) {
          token.isFaceVerified = false;
          token.verified = false;
          token.requiresApproval = true;
        }
      }

      const email = user?.email ?? (token.email as string | undefined);
      if (email) {
        const db = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true, name: true, email: true, image: true, role: true,
            isOtpVerified: true, isFaceVerified: true,
            verified: true, requiresApproval: true,
            businessVerified: true,
          },
        });

        if (db) Object.assign(token, {
          id: db.id,
          name: db.name,
          email: db.email,
          image: db.image,
          role: db.role,
          isOtpVerified: db.isOtpVerified,
          isFaceVerified: db.isFaceVerified,
          verified: db.verified,
          requiresApproval: db.requiresApproval,
          businessVerified: db.businessVerified,
        });
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
          role: token.role as UserRole | null,
          isOtpVerified:    token.isOtpVerified   ?? false,
          isFaceVerified:   token.isFaceVerified  ?? false,
          verified:         token.verified        ?? false,
          requiresApproval: token.requiresApproval?? false,
          businessVerified: token.businessVerified?? false, // ✅ ADDED
        };
      }

      return session;
    },
  },

  events: {
    async signIn({ user, account }) {
      console.log("✅ Signed in:", user.email, "via", account?.provider);
    },
    async signOut({ token }) {
      console.log("👋 Signed out:", token?.email);
    },
    async session({ session }) {
      if (process.env.NODE_ENV === "development") {
        console.log("📦 Session:", {
          email: session.user?.email,
          role: session.user?.role,
          verified: session.user?.verified,
          requiresApproval: session.user?.requiresApproval,
          businessVerified: session.user?.businessVerified,
          expires: session.expires,
        });
      }
    },
  },
};

export default NextAuth(authOptions);
