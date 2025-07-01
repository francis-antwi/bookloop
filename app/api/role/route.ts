import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/authOptions";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // 1. Authentication check
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  const email = session.user.email;

  // 2. Request body validation
  let body: { role?: string };
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request", message: "Malformed JSON body" },
      { status: 400 }
    );
  }

  // 3. Role validation
  const normalizedRole = body.role?.toUpperCase();
  if (!normalizedRole || !["CUSTOMER", "PROVIDER"].includes(normalizedRole)) {
    return NextResponse.json(
      { error: "Invalid role", message: "Role must be either CUSTOMER or PROVIDER" },
      { status: 400 }
    );
  }

  try {
    // 4. Check existing user
    const existingUser = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        role: true,
        isFaceVerified: true,
        selfieImage: true,
        idImage: true
      }
    });

    // 5. Handle new users (Google sign-ups without DB record)
    if (!existingUser) {
      if (normalizedRole === "CUSTOMER") {
        const newUser = await prisma.user.create({
          data: {
            email,
            name: session.user.name ?? "",
            image: session.user.image ?? "",
            role: "CUSTOMER",
            isOtpVerified: true,
            isFaceVerified: false,
          },
        });
        return NextResponse.json(
          { success: true, message: "Customer account created", user: newUser },
          { status: 201 }
        );
      }

      // For providers, we'll create the record after verification
      return NextResponse.json(
        { 
          success: true, 
          message: "Complete verification to become a provider",
          requiresVerification: true
        },
        { status: 200 }
      );
    }

    // 6. Prevent role changes for existing users
    if (existingUser.role && existingUser.role !== normalizedRole) {
      return NextResponse.json(
        { 
          error: "Role change not allowed", 
          message: "Your account role cannot be changed after initial selection"
        },
        { status: 403 }
      );
    }

    // 7. Handle existing users with matching role
    if (existingUser.role === normalizedRole) {
      return NextResponse.json(
        { success: true, message: "Role already set" },
        { status: 200 }
      );
    }

    // 8. Additional verification for providers
    if (normalizedRole === "PROVIDER") {
      if (!existingUser.isFaceVerified || !existingUser.selfieImage || !existingUser.idImage) {
        return NextResponse.json(
          {
            error: "Verification required",
            message: "Complete face and ID verification to become a provider",
            requiresVerification: true
          },
          { status: 403 }
        );
      }

      // Update to provider role
      await prisma.user.update({
        where: { email },
        data: { role: "PROVIDER" },
      });

      return NextResponse.json(
        { success: true, message: "You are now a verified provider" },
        { status: 200 }
      );
    }

    // This should theoretically never be reached due to previous checks
    return NextResponse.json(
      { error: "Unexpected condition", message: "Please contact support" },
      { status: 500 }
    );

  } catch (error) {
    console.error("[ROLE_SELECTION_ERROR]", error);
    return NextResponse.json(
      { error: "Server error", message: "Failed to process role selection" },
      { status: 500 }
    );
  }
}