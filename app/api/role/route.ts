import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, Session } from 'next-auth';
import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client';
import authOptions from '@/app/auth/authOptions';

// Helper to validate role input at runtime
function isValidUserRole(role: any): role is UserRole {
  return Object.values(UserRole).includes(role);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const session: Session | null = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    console.warn('Unauthorized attempt to update role: No valid session.');
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { role } = req.body;

  if (!isValidUserRole(role)) {
    console.warn(`Invalid role provided: ${role}`);
    return res.status(400).json({ message: 'Invalid role provided.' });
  }

  try {
    // Optional: block role update if it's already set
    // const existingUser = await prisma.user.findUnique({
    //   where: { id: session.user.id },
    //   select: { role: true }
    // });
    // if (existingUser?.role) {
    //   return res.status(403).json({ message: 'Role already set and cannot be changed.' });
    // }

    const updateData: any = { role };

    if (role === UserRole.PROVIDER) {
      updateData.isFaceVerified = false;
      updateData.selfieImage = null;
      updateData.idImage = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        isFaceVerified: true,
        selfieImage: true,
        idImage: true,
        // Add more fields here if your client-side UserData needs them
      },
    });

    console.log(`✅ User ${session.user.id} role updated to: ${role}`);
    return res.status(200).json({ user: updatedUser, message: 'Role updated successfully' });

  } catch (error) {
    console.error(`❌ Error updating user role for ${session.user.id}:`, error);
    return res.status(500).json({ message: 'Failed to update role due to a server error.' });
  }
}
