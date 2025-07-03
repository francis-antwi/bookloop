import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import prisma from '@/app/libs/prismadb'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).end();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const { role } = req.body;

    // Validate role
    if (!['CUSTOMER', 'PROVIDER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: decoded.sub as string },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        isFaceVerified: true,
        selfieImage: true,
        idImage: true
      }
    });

    // Optionally issue new token
    const newToken = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    return res.json({ user, token: newToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}