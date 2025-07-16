import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client"; 

const secret = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
  // 1. Authenticate user using NextAuth.js JWT token
  const token = await getToken({ req, secret });

  if (!token?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request body for the desired role
  let role: UserRole;
  try {
    const body = await req.json();
    role = body.role as UserRole; // Cast to UserRole enum for type safety
  } catch (error) {
    console.error("🔥 Error parsing request body:", error);
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON with 'role'." },
      { status: 400 }
    );
  }

  // 3. Validate the provided role
  // Ensure the role is one of the allowed values (CUSTOMER or PROVIDER)
  if (!role || !["CUSTOMER", "PROVIDER"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Allowed roles: CUSTOMER, PROVIDER", redirect: "/role" },
      { status: 400 }
    );
  }

  try {
    // 4. Find the user in the database
    const user = await prisma.user.findUnique({
      where: { email: token.email },
      select: {
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", redirect: "/" },
        { status: 404 }
      );
    }

    // 5. Logic for role assignment/change
    // If user already has a role and it's different from the requested one, prevent change
    if (user.role && user.role !== role) {
      return NextResponse.json(
        {
          error: "Role change not allowed",
          message: `Your role is already set to '${user.role}'.`,
          // Corrected: Added the 'else' part to the ternary operator
          redirect: user.role === "PROVIDER" ? "/verify" : "/",
        },
        { status: 403 }
      );
    }

    // If user tries to set the same role they already have, acknowledge and redirect
    if (user.role === role) {
      return NextResponse.json(
        {
          success: true,
          message: `Role already set to ${role}`,
          // Corrected: Added the 'else' part to the ternary operator
          redirect: role === "PROVIDER" ? "/verify" : "/",
        },
        { status: 200 }
      );
    }

    // 6. Update the user's role in the database
    await prisma.user.update({
      where: { email: token.email },
      data: {
        role,
        // Conditionally set verification status for new PROVIDERs
        ...(role === "PROVIDER" && {
          verified: false, // New providers start as unverified
          isFaceVerified: false, // Also set face verification to false
          requiresApproval: true, // And require approval
        }),
      },
    });

    // 7. Success response
    return NextResponse.json(
      {
        success: true,
        message: "Role set successfully",
        // Corrected: Added the 'else' part to the ternary operator
        redirect: role === "PROVIDER" ? "/verify" : "/",
      },
      { status: 200 }
    );
  } catch (error) {
    // 8. General error handling for database operations
    console.error("🔥 Role update error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update role",
        redirect: "/role", // Redirect back to role selection on server error
      },
      { status: 500 }
    );
  }
}