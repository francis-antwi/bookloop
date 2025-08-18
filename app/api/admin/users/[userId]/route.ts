import prisma from '@/app/libs/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { UserRole } from '@prisma/client';
import authOptions from '@/app/auth/authOptions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized - No session found' });
    }

    // Check admin authorization
    if (session.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Common select fields (remove lastLogin if it doesn't exist in your schema)
    const userSelectFields = {
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
      // Remove if not in your schema: lastLogin: true,
    };

    // Handle PATCH request - update user
    if (req.method === 'PATCH') {
      const { status, role, verified } = req.body;
      
      // Validate request body
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Invalid request body' });
      }

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
        select: userSelectFields
      });
      
      return res.status(200).json(updatedUser);
    }
    
    // Handle GET request - fetch single user
    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          ...userSelectFields,
          // Include related data if needed
          listings: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5 // Limit the number of listings returned
          },
          reservations: {
            select: {
              id: true,
              status: true,
              totalPrice: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5 // Limit the number of reservations returned
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
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}