// pages/api/admin/users/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client';
import authOptions from '@/app/auth/authOptions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add debug logging
  console.log('🔍 API Handler called');
  console.log('📍 Method:', req.method);
  console.log('📍 URL:', req.url);
  console.log('📍 Query:', req.query);
  console.log('📍 Headers:', req.headers);

  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(req, res, authOptions);
    console.log('🔑 Session:', session ? 'Found' : 'Not found');
    console.log('👤 User role:', session?.user?.role);
    
    if (!session || session.user?.role !== UserRole.ADMIN) {
      console.log('❌ Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Handle GET request - fetch users
    if (req.method === 'GET') {
      console.log('✅ Processing GET request');
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
      
      console.log('🔍 Query filters:', where);
      
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
      
      console.log('📊 Found users:', users.length);
      return res.status(200).json(users);
    }
    
    // Handle PATCH request - update user
    if (req.method === 'PATCH') {
      console.log('✏️ Processing PATCH request');
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
      
      console.log('✅ User updated:', updatedUser.id);
      return res.status(200).json(updatedUser);
    }
    
    // Handle other methods
    console.log('❌ Method not allowed:', req.method);
    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
    
  } catch (error) {
    console.error('💥 Error in users API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}