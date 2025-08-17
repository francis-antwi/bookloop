'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';

interface SessionProviderWrapperProps {
  children: React.ReactNode;
  session?: Session | null;
}

export default function SessionProviderWrapper({ children, session }: SessionProviderWrapperProps) {
  return (
    <NextAuthSessionProvider session={session ?? undefined}>
      {children}
    </NextAuthSessionProvider>
  );
}

SessionProviderWrapper.displayName = 'SessionProviderWrapper';
