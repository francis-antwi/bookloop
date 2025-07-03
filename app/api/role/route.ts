// pages/api/role.ts (for Pages Router) or app/api/role/route.ts (for App Router)

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, Session } from 'next-auth'; // Import Session type here
 // Adjust path to your authOptions
import prisma from '@/app/libs/prismadb'; // Your Prisma client
import { UserRole } from '@prisma/client'; // Your UserRole enum
import authOptions from '@/app/auth/authOptions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure only PATCH requests are allowed for updating roles
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // 1. Get the session using getServerSession. This securely reads the NextAuth.js session cookie.
  // Explicitly type 'session' as Session | null to help TypeScript
  const session: Session | null = await getServerSession(req, res, authOptions);

  // 2. Check if the user is authenticated.
  // If no session or no user in session, return 401 Unauthorized.
  // This is the primary check for "Authentication required" from the backend.
  if (!session || !session.user || !session.user.id) {
    console.warn('Unauthorized attempt to update role: No valid session found.');
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { role } = req.body;

  // 3. Validate the incoming role against your UserRole enum.
  // Ensure the role is one of the allowed values (CUSTOMER or PROVIDER).
  if (!role || !Object.values(UserRole).includes(role)) {
    console.warn(`Invalid role provided: ${role}`);
    return res.status(400).json({ message: 'Invalid role provided.' });
  }

  try {
    // 4. Update the user's role in the database using the ID from the authenticated session.
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id }, 
      data: {
        role: role,
        // Apply the specific business logic for PROVIDER role:
        // If the role is set to PROVIDER, reset isFaceVerified to false,
        // and clear selfieImage/idImage to require re-verification.
        // If role is CUSTOMER, these fields are left untouched (undefined means no change).
        isFaceVerified: role === UserRole.PROVIDER ? false : undefined,
        selfieImage: role === UserRole.PROVIDER ? null : undefined, 
        idImage: role === UserRole.PROVIDER ? null : undefined,     
      },
      select: { // Select only necessary fields to return to the client for session update
        id: true,
        email: true,
        role: true,
        isFaceVerified: true,
        selfieImage: true,
        idImage: true,
        // Include any other fields that your frontend's UserData interface expects
      }
    });

    console.log(`User ${session.user.id} role updated to: ${role}`);
    // 5. Return the updated user data. 
    // The frontend's `useSession().update()` will then automatically refresh its session state.
    return res.status(200).json({ user: updatedUser, message: 'Role updated successfully' });

  } catch (error) {
    console.error(`Error updating user role for ${session.user.id}:`, error);
    // Provide a generic error message for security reasons
    return res.status(500).json({ message: 'Failed to update role due to a server error.' });
  }
}
