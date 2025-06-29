import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

function parseDate(dateStr: string): Date | null {
  const parts = dateStr.split(/[\/\-\.]/).map(p => p.trim());
  if (parts.length === 3) {
    let [day, month, year] = parts;
    if (year.length === 2) year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
    const iso = `${year}-${month}-${day}`;
    const date = new Date(iso);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      name,
      contactPhone,
      password,
      role, // No default - must be explicitly selected
      selfieImage,
      idImage,
      faceConfidence,
      idName,
      idNumber,
      idDOB,
      idExpiryDate,
      idIssuer,
      idIssueDate,
      personalIdNumber,
      otpCode
    } = body;

    // Strict validation - role must be provided
    const requiredFields = {
      email,
      name,
      password,
      role,
      contactPhone,
      otpCode
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate OTP first
    const otpVerification = await prisma.oTPVerification.findFirst({
      where: {
        phoneNumber: contactPhone,
        code: otpCode,
        verified: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpVerification) {
      return NextResponse.json(
        { 
          error: "OTP verification failed",
          details: otpCode 
            ? "The OTP is invalid or has expired"
            : "No OTP code provided"
        },
        { status: 403 }
      );
    }

    // Check for existing users
    const [existingEmail, existingPhone] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { contactPhone } })
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    if (existingPhone) {
      return NextResponse.json(
        { error: "This phone number is already registered" },
        { status: 409 }
      );
    }

    // Strict role validation
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: "Invalid user role selected" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Provider-specific validation
    if (role === "PROVIDER") {
      const providerRequirements = {
        selfieImage: "Selfie image is required",
        idImage: "ID image is required",
        faceConfidence: "Face verification score is required",
        idName: "Full name from ID is required",
        idNumber: "ID number is required"
      };

      const missingProviderFields = Object.entries({
        selfieImage,
        idImage,
        faceConfidence,
        idName,
        idNumber
      }).filter(([_, value]) => !value);

      if (missingProviderFields.length > 0) {
        return NextResponse.json(
          {
            error: "Incomplete provider information",
            missingFields: missingProviderFields.map(([key]) => providerRequirements[key])
          },
          { status: 400 }
        );
      }

      if (typeof faceConfidence !== "number" || faceConfidence < 0) {
        return NextResponse.json(
          { error: "Invalid face verification confidence score" },
          { status: 400 }
        );
      }
    }

    // Parse and validate dates (only for providers)
    let parsedDOB: Date | null = null;
    let parsedExpiry: Date | null = null;
    let parsedIssueDate: Date | null = null;

    if (role === "PROVIDER") {
      parsedDOB = idDOB ? parseDate(idDOB) : null;
      if (idDOB && !parsedDOB) {
        return NextResponse.json(
          { error: "Invalid date of birth format (use DD/MM/YYYY)" },
          { status: 400 }
        );
      }

      parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
      if (idExpiryDate && !parsedExpiry) {
        return NextResponse.json(
          { error: "Invalid ID expiry date format (use DD/MM/YYYY)" },
          { status: 400 }
        );
      }

      parsedIssueDate = idIssueDate ? parseDate(idIssueDate) : null;
      if (idIssueDate && !parsedIssueDate) {
        return NextResponse.json(
          { error: "Invalid ID issue date format (use DD/MM/YYYY)" },
          { status: 400 }
        );
      }

      // Validate date ranges
      if (parsedDOB && (
        parsedDOB.getFullYear() < 1900 || 
        parsedDOB > new Date()
      )) {
        return NextResponse.json(
          { error: "Invalid date of birth" },
          { status: 400 }
        );
      }

      if (parsedExpiry && parsedExpiry < new Date()) {
        return NextResponse.json(
          { error: "ID document has expired" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user in transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          contactPhone,
          hashedPassword,
          role,
          isOtpVerified: true,
          ...(role === "PROVIDER" && {
            isFaceVerified: true,
            selfieImage,
            idImage,
            faceConfidence,
            idName,
            idNumber,
            idDOB: parsedDOB,
            idExpiryDate: parsedExpiry,
            idIssueDate: parsedIssueDate,
            idIssuer,
            personalIdNumber
          })
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          contactPhone: true,
          isFaceVerified: true,
          createdAt: true
        }
      });

      await tx.oTPVerification.delete({
        where: { id: otpVerification.id }
      });

      return newUser;
    });

    return NextResponse.json({ 
      success: true, 
      user: result,
      message: role === "PROVIDER" 
        ? "Provider account created successfully" 
        : "Account created successfully"
    }, { status: 201 });

  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { 
        error: "Registration failed",
        details: process.env.NODE_ENV === "development" 
          ? error.message 
          : "Please try again later"
      },
      { status: 500 }
    );
  }
}