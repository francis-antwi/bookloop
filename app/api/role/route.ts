import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Verify user is authenticated
  const session = await getSession({ req });
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 3. Validate request body
  const { role } = req.body;
  
  if (!role) {
    return res.status(400).json({ error: 'Role is required' });
  }

  // 4. Check if role is valid
  if (!['CUSTOMER', 'PROVIDER'].includes(role)) {
    return res.status(400).json({ 
      error: 'Invalid role',
      message: 'Allowed roles: CUSTOMER, PROVIDER' 
    });
  }

  try {
    // 5. Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        role: true,
        isFaceVerified: true,
        selfieImage: true,
        idImage: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 6. Check if role is already set
    if (currentUser.role === role) {
      return res.status(200).json({ 
        success: true,
        message: 'Role already set' 
      });
    }

    // 7. Additional checks for PROVIDER role
    if (role === 'PROVIDER') {
      if (!currentUser.isFaceVerified || !currentUser.selfieImage || !currentUser.idImage) {
        return res.status(403).json({ 
          error: 'Verification required',
          message: 'Complete identity verification to become a provider'
        });
      }
    }

    // 8. Update user role
    await prisma.user.update({
      where: { email: session.user.email },
      data: { role },
    });

    return res.status(200).json({ 
      success: true,
      message: 'Role updated successfully' 
    });

  } catch (error) {
    console.error('Role update error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update role' 
    });
  }
}