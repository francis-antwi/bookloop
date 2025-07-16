// ============================
// ✅ NextAuth Configuration
// ============================

import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export const authOptions: AuthOptions = {
  providers: [
    /* ——— Google ——— */
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    /* ——— Email / Password ——— */
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "text"     },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("MISSING_CREDENTIALS");
        }

        /* ── Look‑up user ───────────────────────────── */
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.hashedPassword) throw new Error("INVALID_CREDENTIALS");

        /* ── Verify password ────────────────────────── */
        const ok = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!ok) throw new Error("INVALID_CREDENTIALS");

        /* ── Gate‑keep providers ────────────────────── */
        if (
          user.role === UserRole.PROVIDER &&
          (!user.verified || user.requiresApproval) // Removed !user.isFaceVerified
        ) {
          // three separate reasons funneled into one error:
          //  - admin hasn’t flipped "requiresApproval"
          //  - verified flag still false (implies initial verification, including face, is not done)
          throw new Error("PROVIDER_NOT_APPROVED");
        }

        if (!user.role) throw new Error("MISSING_ROLE");

        return {
          id:               user.id,
          name:             user.name,
          email:            user.email,
          image:            user.image,
          role:             user.role,
          isOtpVerified:    user.isOtpVerified   ?? false,
          isFaceVerified:   user.isFaceVerified  ?? false, // Keep for token, but not for blocking
          verified:         user.verified        ?? false,
          requiresApproval: user.requiresApproval?? false,
        };
      },
    }),
  ],

  /* ——— Custom pages ——— */
  pages: {
    signIn: "/",
    error:  "/auth/error",
    newUser:"/role",
  },

  /* ——— Session & JWT ——— */
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  jwt:     { maxAge: 30 * 24 * 60 * 60 },
  secret:  process.env.NEXTAUTH_SECRET,
  debug:   process.env.NODE_ENV === "development",
  trustHost: true,

  /* ——— Callbacks ——— */
  callbacks: {
    /* -------- signIn for OAuth providers -------- */
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const db = await prisma.user.findUnique({ where: { email: user.email } });

        /* Gate‑keep providers logging in via Google */
        if (db?.role === UserRole.PROVIDER &&
            (!db.verified || db.requiresApproval)) { // Removed !db.isFaceVerified
          console.warn("🛑 PROVIDER not approved – Google login blocked.");
          return false;
        }

        /* If first‑time Google user, create basic record */
        if (!db) {
          await prisma.user.create({
            data: {
              email:  user.email,
              name:   user.name  ?? "",
              image:  user.image ?? null,
              role:   null,                  // they’ll pick later
              verified:         false,
              isFaceVerified:   false,
              requiresApproval: false,
            },
          });
        }
      }
      return true;
    },

    /* -------- JWT: enrich & react to updates -------- */
    async jwt({ token, user, trigger, session }) {
      /* Handle role‑picker UI saving role into session → token */
      if (trigger === "update" && session?.role) {
        token.role = session.role;
        await prisma.user.update({
          where: { email: token.email! },
          data:  { role: session.role },
        });
        if (session.role === UserRole.PROVIDER) {
          token.isFaceVerified   = false;
          token.verified         = false;
          token.requiresApproval = true;
        }
      }

      /* Always refresh token from DB */
      const email = user?.email ?? token.email as string | undefined;
      if (email) {
        const db = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true, name: true, email: true, image: true, role: true,
            isOtpVerified: true, isFaceVerified: true,
            verified: true, requiresApproval: true,
          },
        });
        if (db) Object.assign(token, {
          id: db.id, name: db.name, email: db.email, image: db.image,
          role: db.role,
          isOtpVerified:    db.isOtpVerified,
          isFaceVerified:   db.isFaceVerified,
          verified:         db.verified,
          requiresApproval: db.requiresApproval,
        });
      }
      return token;
    },

    /* -------- Session object to client -------- */
    async session({ session, token }) {
      if (session.user) {
        session.user = {
          id: token.id as string,
          name: token.name ?? null,
          email: token.email ?? null,
          image: token.image ?? null,
          role: token.role as UserRole | null,
          isOtpVerified:    token.isOtpVerified   ?? false,
          isFaceVerified:   token.isFaceVerified  ?? false,
          verified:         token.verified        ?? false,
          requiresApproval: token.requiresApproval?? false,
        };
      }
      return session;
    },
  },

  /* ——— Events (for logging) ——— */
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
          expires: session.expires,
        });
      }
    },
  },
};

export default NextAuth(authOptions);
