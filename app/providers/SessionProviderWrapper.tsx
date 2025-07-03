// app/providers/SessionProviderWrapper.tsx
'use client'; // This is a client component

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { Session } from 'next-auth'; // Import Session type for better typing

interface SessionProviderWrapperProps {
  children: React.ReactNode;
  session: Session | null; // Expect a Session object or null
}

/**
 * SessionProviderWrapper is a client component that wraps the NextAuth SessionProvider.
 * This is necessary in the App Router to make the session available to client components
 * using the useSession hook, as getServerSession is a server-side function.
 */
export default function SessionProviderWrapper({ children, session }: SessionProviderWrapperProps) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
