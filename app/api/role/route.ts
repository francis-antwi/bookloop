import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const token = await getToken({ req, secret });
    if (!token?.email) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No session or email found" },
        { status: 401 }
      );
    }

    // Parse request body
    let body: { role?: string };
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate role
    const normalizedRole = body.role?.toUpperCase();
    if (!normalizedRole || !["CUSTOMER", "PROVIDER"].includes(normalizedRole)) {
      return NextResponse.json(
        { 
          error: "Bad Request", 
          message: "Valid role (CUSTOMER or PROVIDER) is required" 
        },
        { status: 400 }
      );
    }

    const email = token.email;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    // Handle new users (no existing record)
    if (!existingUser) {
      if (normalizedRole === "CUSTOMER") {
        const newUser = await prisma.user.create({
          data: {
            email,
            name: token.name ?? "",
            image: token.picture ?? null,
            isOtpVerified: true,
            isFaceVerified: false,
            role: "CUSTOMER",
          },
        });

        return NextResponse.json(
          { 
            success: true, 
            message: "Customer account created", 
            user: {
              id: newUser.id,
              email: newUser.email,
              role: newUser.role
            } 
          },
          { status: 201 }
        );
      }

      // For new providers, defer creation until verification
      return NextResponse.json(
        {
          success: false,
          skipCreate: true,
          message: "Provider account requires verification before creation",
        },
        { status: 200 }
      );
    }

    // Handle existing users
    if (existingUser.role === normalizedRole) {
      return NextResponse.json(
        { 
          success: true, 
          message: "Role already set", 
          user: {
            id: existingUser.id,
            email: existingUser.email,
            role: existingUser.role
          }
        },
        { status: 200 }
      );
    }

    // Additional checks for provider role
    if (normalizedRole === "PROVIDER") {
      if (!existingUser.isFaceVerified || !existingUser.selfieImage || !existingUser.idImage) {
        return NextResponse.json(
          {
            error: "Verification required",
            message: "Complete ID and face verification to become a provider",
            requiredVerification: true
          },
          { status: 403 }
        );
      }
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: normalizedRole as UserRole },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Role updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("[ROLE_API_ERROR]", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing your request",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}