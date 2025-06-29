import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

function parseDate(dateStr: string): Date | null {
  try {
    const parts = dateStr.split(/[\/\-\.]/).map(p => p.trim());
    if (parts.length === 3) {
      let [day, month, year] = parts;
      if (year.length === 2) year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const date = new Date(iso);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  } catch (error) {
    console.error('Date parsing error:', { dateStr, error });
    return null;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  let errorContext: any = {};

  try {
    const body = await request.json();
    errorContext.requestBody = body; // Log initial request

    const {
      email,
      name,
      contactPhone,
      password,
      role,
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

    // Validate required fields
    const requiredFields = { email, name, password, role, contactPhone };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      errorContext.missingFields = missingFields;
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}`, details: missingFields },
        { status: 400 }
      );
    }

    // Validate OTP via Prisma
    const otpVerification = await prisma.oTPVerification.findFirst({
      where: {
        phoneNumber: contactPhone,
        code: otpCode,
        verified: true,
        expiresAt: { gt: new Date() }
      }
    });

    errorContext.otpVerificationAttempt = {
      phoneNumber: contactPhone,
      codeProvided: otpCode,
      foundRecord: !!otpVerification
    };

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

    errorContext.existingUsersCheck = {
      emailExists: !!existingEmail,
      phoneExists: !!existingPhone
    };

    if (existingEmail) {
      return NextResponse.json(
        { 
          error: "This email is already registered",
          details: { registeredEmail: existingEmail.email }
        },
        { status: 409 }
      );
    }

    if (existingPhone) {
      return NextResponse.json(
        { 
          error: "This phone number is already registered",
          details: { registeredPhone: existingPhone.contactPhone }
        },
        { status: 409 }
      );
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      errorContext.invalidRole = role;
      return NextResponse.json(
        { 
          error: "Invalid user role selected",
          details: { validRoles: Object.values(UserRole) }
        },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorContext.invalidEmail = email;
      return NextResponse.json(
        { error: "Please enter a valid email address", details: { email } },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      errorContext.passwordLength = password.length;
      return NextResponse.json(
        { 
          error: "Password must be at least 8 characters",
          details: { length: password.length }
        },
        { status: 400 }
      );
    }

    // Provider-specific validation
    let parsedDOB: Date | null = null;
    let parsedExpiry: Date | null = null;
    let parsedIssueDate: Date | null = null;

    if (role === "PROVIDER") {
      const providerRequired = {
        selfieImage: "Selfie image is required",
        idImage: "ID image is required",
        faceConfidence: "Face verification score is required",
        idName: "Full name from ID is required",
        idNumber: "ID number is required"
      };

      const missingProvider = Object.entries({
        selfieImage,
        idImage,
        faceConfidence,
        idName,
        idNumber
      }).filter(([_, val]) => !val);

      errorContext.providerValidation = {
        missingFields: missingProvider.map(([key]) => key),
        faceConfidenceValue: faceConfidence
      };

      if (missingProvider.length > 0) {
        return NextResponse.json(
          {
            error: "Incomplete provider information",
            details: {
              missingFields: missingProvider.map(([key]) => providerRequired[key]),
              requiredFields: Object.keys(providerRequired)
            }
          },
          { status: 400 }
        );
      }

      if (typeof faceConfidence !== "number" || faceConfidence < 0) {
        return NextResponse.json(
          { 
            error: "Invalid face verification confidence score",
            details: { score: faceConfidence }
          },
          { status: 400 }
        );
      }

      // Date parsing and validation
      parsedDOB = idDOB ? parseDate(idDOB) : null;
      parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
      parsedIssueDate = idIssueDate ? parseDate(idIssueDate) : null;

      errorContext.dateValidation = {
        idDOB: { input: idDOB, parsed: parsedDOB?.toISOString() },
        idExpiryDate: { input: idExpiryDate, parsed: parsedExpiry?.toISOString() },
        idIssueDate: { input: idIssueDate, parsed: parsedIssueDate?.toISOString() }
      };

      if (idDOB && !parsedDOB) {
        return NextResponse.json(
          { 
            error: "Invalid date of birth format (use DD/MM/YYYY)",
            details: { formatExample: "31/12/1990" }
          },
          { status: 400 }
        );
      }

      if (parsedDOB && (parsedDOB.getFullYear() < 1900 || parsedDOB > new Date())) {
        return NextResponse.json(
          { 
            error: "Invalid date of birth",
            details: { 
              date: parsedDOB.toISOString(),
              minYear: 1900,
              maxDate: new Date().toISOString() 
            }
          },
          { status: 400 }
        );
      }

      if (idExpiryDate && !parsedExpiry) {
        return NextResponse.json(
          { 
            error: "Invalid ID expiry date format (use DD/MM/YYYY)",
            details: { formatExample: "31/12/2030" }
          },
          { status: 400 }
        );
      }

      if (parsedExpiry && parsedExpiry < new Date()) {
        return NextResponse.json(
          { 
            error: "ID document has expired",
            details: { 
              expiryDate: parsedExpiry.toISOString(),
              currentDate: new Date().toISOString() 
            }
          },
          { status: 400 }
        );
      }

      if (idIssueDate && !parsedIssueDate) {
        return NextResponse.json(
          { 
            error: "Invalid ID issue date format (use DD/MM/YYYY)",
            details: { formatExample: "31/12/2020" }
          },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user transactionally
    const user = await prisma.$transaction(async (tx) => {
      const userData = {
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
      };

      errorContext.userCreationAttempt = userData;

      const createdUser = await tx.user.create({
        data: userData,
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

      await tx.oTPVerification.delete({ where: { id: otpVerification.id } });

      return createdUser;
    });

    return NextResponse.json(
      {
        success: true,
        user,
        message: role === "PROVIDER"
          ? "Provider account created successfully"
          : "Account created successfully"
      },
      { status: 201 }
    );

  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...errorContext,
      durationMs: Date.now() - startTime
    };

    console.error("REGISTRATION_FAILURE", JSON.stringify(errorDetails, null, 2));

    return NextResponse.json(
      {
        error: "Registration failed",
        details: process.env.NODE_ENV === "development" ? errorDetails : null
      },
      { status: 500 }
    );
  }
}