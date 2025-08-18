// pages/api/admin/users/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || session.user?.role !== UserRole.ADMIN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Handle GET request - fetch users
    if (req.method === 'GET') {
      const { role, status, search } = req.query;
      
      // Build where clause for filtering
      const where: any = {};
      
      if (role && role !== 'all') {
        where.role = role as UserRole;
      }
      
      if (status && status !== 'all') {
        where.status = status as string;
      }
      
      if (search && typeof search === 'string') {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { contactPhone: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Fetch users with filters
      const users = await prisma.user.findMany({
        where,
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
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return res.status(200).json(users);
    }
    
    // Handle PATCH request - update user
    if (req.method === 'PATCH') {
      const { id, status, role, verified } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
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
    
    // Handle other methods
    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
    
  } catch (error) {
    console.error('Error in users API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}