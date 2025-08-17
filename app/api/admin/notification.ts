import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/auth/authOptions';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { userId, message, type, adminOnly, email, contactPhone } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
        type,
        adminOnly,
        email,
        contactPhone,
      },
    });

    return res.status(200).json(notification);
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
