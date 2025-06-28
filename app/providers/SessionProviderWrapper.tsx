'use client';

import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { refreshToken } from '@/lib/auth';

interface SessionProviderWrapperProps {
  children: React.ReactNode;
  session: Session | null;
}

export default function SessionProviderWrapper({
  children,
  session,
}: SessionProviderWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Auto-refresh session before token expires
  useEffect(() => {
    if (!session) return;

    const tokenExpiry = session.expires ? new Date(session.expires).getTime() : 0;
    const currentTime = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes before expiry

    if (tokenExpiry - currentTime < bufferTime) {
      refreshToken().catch(() => {
        router.push('/auth/signin?callbackUrl=' + encodeURIComponent(pathname));
      });
    }
  }, [session, router, pathname]);

  return (
    <SessionProvider
      session={session}
      // Refresh session every 15 minutes if window is focused
      refetchInterval={15 * 60}
      refetchOnWindowFocus={true}
      // Revalidate session when tab becomes visible
      refetchWhenOffline={false}
      // Handle session expiration gracefully
      onSessionError={() => {
        router.push('/auth/signin?callbackUrl=' + encodeURIComponent(pathname));
      }}
    >
      {children}
    </SessionProvider>
  );
}