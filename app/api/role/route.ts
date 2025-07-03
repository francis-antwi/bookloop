import { NextApiRequest, NextApiResponse } from 'next';
// Import getServerSession and authOptions
import { getServerSession } from 'next-auth';
// Adjust path as per your project structure
import prisma from '@/app/libs/prismadb';
import { UserRole } from '@prisma/client'; // Assuming UserRole enum is accessible

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure only PATCH requests are allowed for updating roles
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // 1. Get the session using getServerSession
  const session = await getServerSession(req, res, authOptions);

  // 2. Check if the user is authenticated
  // If no session or no user in session, return 401 Unauthorized
  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { role } = req.body;

  // 3. Validate the incoming role against your UserRole enum
  // Ensure the role is one of the allowed values
  if (!role || !Object.values(UserRole).includes(role)) {
    return res.status(400).json({ message: 'Invalid role provided.' });
  }

  try {
    // 4. Update the user's role in the database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id }, // Use the user ID from the session
      data: {
        role: role,
        // Apply the same logic as in your NextAuth.js jwt callback:
        // If the role is set to PROVIDER, reset isFaceVerified to false.
        // Also, consider clearing selfieImage and idImage here if they should be reset.
        isFaceVerified: role === UserRole.PROVIDER ? false : undefined,
        selfieImage: role === UserRole.PROVIDER ? null : undefined, // Clear if changing to PROVIDER
        idImage: role === UserRole.PROVIDER ? null : undefined,     // Clear if changing to PROVIDER
      },
      select: { // Select only necessary fields to return to the client
        id: true,
        email: true,
        role: true,
        isFaceVerified: true,
        selfieImage: true,
        idImage: true,
        // Add any other fields that RoleSelector's UserData interface expects
      }
    });

    // 5. Return the updated user data.
    // The frontend's `useSession().update()` will then automatically refresh its session state.
    return res.status(200).json({ user: updatedUser, message: 'Role updated successfully' });

  } catch (error) {
    console.error('Error updating user role:', error);
    // Provide a more generic error message for security
    return res.status(500).json({ message: 'Failed to update role due to a server error.' });
  }
}
