// utils/verifyFirebase.ts
import { auth } from '@/libs/firebaseAuth';

export const verifyFirebaseSetup = () => {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('Missing Firebase environment variables:', missingVars);
    return false;
  }

  if (!auth.app) {
    console.error('Firebase app not attached to auth instance');
    return false;
  }

  if (!auth.settings) {
    console.error('Auth settings not initialized');
    return false;
  }

  return true;
};