import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/app/libs/prismadb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { role } = req.body;

  if (!['CUSTOMER', 'PROVIDER'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { role },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Role assignment error:', error);
    return res.status(500).json({ error: 'Failed to assign role' });
  }
}