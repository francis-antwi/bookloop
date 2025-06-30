import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth/authOptions';

export async function handler(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log("User session:", session.user);
}
