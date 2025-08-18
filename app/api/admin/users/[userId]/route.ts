// pages/api/admin/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || session.user?.role !== UserRole.ADMIN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Handle PATCH request - update user
    if (req.method === 'PATCH') {
      const { status, role, verified } = req.body;
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Build update data
      const updateData: any = {};
      
      if (status !== undefined) {
        updateData.status = status;
      }
      
      if (role !== undefined) {
        updateData.role = role;
      }
      
      if (verified !== undefined) {
        updateData.verified = verified;
      }
      
      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          contactPhone: true,
          role: true,
          status: true,
          verified: true,
          businessVerified: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
        }
      });
      
      return res.status(200).json(updatedUser);
    }
    
    // Handle GET request - fetch single user
    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          contactPhone: true,
          role: true,
          status: true,
          verified: true,
          businessVerified: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          // Include related data if needed
          listings: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
            }
          },
          reservations: {
            select: {
              id: true,
              status: true,
              totalPrice: true,
              createdAt: true,
            }
          },
          businessVerification: true,
        }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json(user);
    }
    
    // Handle other methods
    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
    
  } catch (error) {
    console.error('Error in user API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}