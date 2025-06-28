import { getSession, update } from 'next-auth/react';

export async function refreshToken() {
  const session = await getSession();
  if (!session) return null;
  
  try {
    return await update({
      ...session,
      expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 more minutes
    });
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}