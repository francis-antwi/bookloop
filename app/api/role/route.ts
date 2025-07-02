import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client"; // Ensure UserRole enum is correctly imported

/**
 * POST /api/role
 * Handles the selection or update of a user's role.
 * Requires an authenticated session (JWT token).
 *
 * @param req The NextRequest object containing the request details.
 * @returns NextResponse with success or error message and updated user data.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user using the JWT token from the request
    const token = await getToken({ req });

    // If no token or email in token, user is unauthorized
    if (!token || !token.email) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    // 2. Parse the request body to get the desired role
    const { role } = await req.json();
    const normalizedRole = (role as string)?.toUpperCase(); // Normalize role to uppercase

    // 3. Validate the provided role
    if (!normalizedRole || !Object.values(UserRole).includes(normalizedRole as UserRole)) {
      return NextResponse.json(
        { error: "Invalid role", message: "Role must be either 'CUSTOMER' or 'PROVIDER'." },
        { status: 400 }
      );
    }

    // 4. Find the user in the database using the email from the token
    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    // If user not found, return 404
    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "The user associated with this session could not be found." },
        { status: 404 }
      );
    }

    // 5. Special check for 'PROVIDER' role: enforce verification
    // If the user tries to set their role to 'PROVIDER' but hasn't completed
    // face and ID verification, block the update.
    if (
      normalizedRole === UserRole.PROVIDER &&
      (!user.isFaceVerified || !user.selfieImage || !user.idImage)
    ) {
      return NextResponse.json(
        {
          error: "Verification required",
          message: "Face and ID verification must be completed before becoming a Service Provider.",
        },
        { status: 403 } // Forbidden status code
      );
    }

    // 6. Check if the role is already set to the requested role
    // If the user's current role is already the same as the requested role,
    // skip the database update and return a success message.
    if (user.role === normalizedRole) {
      return NextResponse.json(
        { success: true, message: `Role is already set to ${normalizedRole}.`, user },
        { status: 200 }
      );
    }

    // 7. Update the user's role in the database
    const updatedUser = await prisma.user.update({
      where: { email: token.email },
      data: {
        role: normalizedRole as UserRole, // Cast to UserRole enum for type safety
        // If you had a separate `hasSelectedRole` field in your Prisma model,
        // you would set it here: `hasSelectedRole: true,`
      },
    });

    // 8. Return success response with the updated user data
    // The `shouldRefreshSession` flag is a hint for the frontend to re-fetch the session
    // (though the client-side `useSession().update()` handles this more directly now).
    return NextResponse.json(
      {
        success: true,
        message: `Your role has been successfully updated to ${normalizedRole}.`,
        user: updatedUser,
        shouldRefreshSession: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // 9. Handle any unexpected errors during the process
    console.error("API Error: Role update failed:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message || "An unexpected error occurred while updating your role.",
      },
      { status: 500 }
    );
  }
}