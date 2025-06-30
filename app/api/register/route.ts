import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import authOptions from "@/app/auth/authOptions";

/**
 * Parses a date string into a Date object.
 * Supports various common date formats (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY).
 * Handles two-digit years by assuming 19xx or 20xx based on the year value.
 * @param dateStr The date string to parse.
 * @returns A Date object if parsing is successful, otherwise null.
 */
function parseDate(dateStr: string): Date | null {
  try {
    // Split the date string by common separators: '/', '-', '.'
    const parts = dateStr.split(/[\/\-\.]/).map(p => p.trim());

    // Expect exactly three parts (day, month, year)
    if (parts.length === 3) {
      let [day, month, year] = parts;

      // Handle two-digit year: assume 19xx if > 30, else 20xx
      if (year.length === 2) {
        year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
      }

      // Format to ISO string (YYYY-MM-DD) for reliable Date object creation
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const date = new Date(iso);

      // Check if the date is valid (not 'Invalid Date')
      return isNaN(date.getTime()) ? null : date;
    }
  } catch (e) {
    // Log any parsing errors for debugging
    console.error("Date parsing error:", e);
  }
  return null;
}

export async function POST(request: Request) {
  const startTime = Date.now(); // Record start time for performance monitoring
  const errorContext: any = {}; // Object to store context for error logging

  try {
    // Get server session to check for Google authentication
    const session = await getServerSession(authOptions);
    // Determine if the user is authenticating via Google (no password/OTP means Google)
    const isGoogleAuth = !!(session?.user && !session.user.password && !session.user.otpCode);
    const googleUserEmail = session?.user?.email || null;
    const googleUserName = session?.user?.name?.trim() || "";

    // Parse the request body
    const body = await request.json();
    console.log("📦 Registration payload received:", JSON.stringify(body, null, 2));
    errorContext.requestBody = body; // Store request body in error context

    // Destructure required fields from the request body
    const {
      email,
      name,
      contactPhone,
      password,
      role = "CUSTOMER", // Default role to CUSTOMER
      otpCode,
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
      imageUrl, // Alternative for idImage
      selfieUrl, // Alternative for selfieImage
      nationality,
      gender,
      placeOfIssue,
      idType,
      rawText,
      verified, // Explicit 'verified' status from frontend
      extractionComplete // Flag for Google PROVIDER ID extraction
    } = body;

    // Validate if the provided role is a valid UserRole enum value
    if (!Object.values(UserRole).includes(role)) {
      console.warn(`Attempted registration with invalid role: ${role}`);
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    // Early check for existing Google user:
    // If it's a Google auth attempt and an email is provided, check if user already exists.
    if (isGoogleAuth && googleUserEmail) {
      const existingGoogleUser = await prisma.user.findUnique({ where: { email: googleUserEmail } });
      if (existingGoogleUser) {
        console.warn(`Google user with email ${googleUserEmail} already exists.`);
        return NextResponse.json({ error: "Google user already exists" }, { status: 409 });
      }
    }

    // Basic validation: Ensure name is provided for non-Google registrations
    if (!name && !isGoogleAuth) {
      console.warn("Missing required field: name for non-Google registration.");
      return NextResponse.json({
        error: "Missing required fields",
        missing: ["name"]
      }, { status: 400 });
    }

    // Check for existing email or phone number concurrently
    const [existingEmail, existingPhone] = await Promise.all([
      email ? prisma.user.findUnique({ where: { email } }) : null,
      contactPhone ? prisma.user.findUnique({ where: { contactPhone } }) : null
    ]);

    // Prevent registration if email already exists (for non-Google users)
    if (!isGoogleAuth && existingEmail) {
      console.warn(`Email ${email} already registered.`);
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    // Prevent registration if phone number already exists
    if (existingPhone) {
      console.warn(`Phone number ${contactPhone} already registered.`);
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    // OTP Verification for non-Google registrations
    // Google users will be marked as OTP verified automatically below
    if (!isGoogleAuth && otpCode && contactPhone) {
      const otpVerification = await prisma.oTPVerification.findFirst({
        where: {
          phoneNumber: contactPhone,
          code: otpCode,
          verified: true,
          expiresAt: { gt: new Date() } // Ensure OTP is not expired
        }
      });

      if (!otpVerification) {
        console.warn(`Invalid or expired OTP for phone ${contactPhone}.`);
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 403 });
      }

      // Delete the OTP record after successful verification
      await prisma.oTPVerification.delete({ where: { id: otpVerification.id } });
      console.log(`OTP successfully verified and deleted for phone ${contactPhone}.`);
    }

    // Parse date strings for ID documents
    const parsedDOB = idDOB ? parseDate(idDOB) : null;
    const parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
    const parsedIssue = idIssueDate ? parseDate(idIssueDate) : null;

    // PROVIDER-specific validation
    if (role === "PROVIDER") {
      console.log("Initiating PROVIDER-specific validation...");
      const missing = [];

      // Check for required image data
      if (!selfieImage && !selfieUrl) {
        missing.push("selfieImage");
        console.warn("PROVIDER validation: Missing selfie image.");
      }
      if (!idImage && !imageUrl) {
        missing.push("idImage");
        console.warn("PROVIDER validation: Missing ID image.");
      }
      // Check face confidence threshold
      if (!faceConfidence || Number(faceConfidence) < 0.5) {
        missing.push("faceConfidence");
        console.warn(`PROVIDER validation: Face confidence (${faceConfidence}) too low or missing.`);
      }
      // Check for ID name
      if (!idName) {
        missing.push("idName");
        console.warn("PROVIDER validation: Missing ID name.");
      }
      // Check for ID number (either idNumber or personalIdNumber)
      if (!idNumber && !personalIdNumber) {
        missing.push("idNumber or personalIdNumber");
        console.warn("PROVIDER validation: Missing ID number or personal ID number.");
      }
      // Check for ID type
      if (!idType) {
        missing.push("idType");
        console.warn("PROVIDER validation: Missing ID type.");
      }

      // If any required provider data is missing, return an error
      if (missing.length > 0) {
        console.error(`PROVIDER validation failed: Missing required data - ${missing.join(", ")}`);
        return NextResponse.json({
          error: "Missing provider verification data",
          missing,
          message: "Verification incomplete. User not saved."
        }, { status: 400 });
      }

      // Validate ID expiry date
      if (parsedExpiry) {
        if (parsedExpiry < new Date()) {
          console.error("PROVIDER validation: ID document has expired.");
          return NextResponse.json({ error: "ID document has expired" }, { status: 400 });
        }
      } else {
        console.warn("PROVIDER validation: ID expiry date not parsed or provided.");
      }

      // Validate date of birth
      if (parsedDOB) {
        if (parsedDOB > new Date()) {
          console.error("PROVIDER validation: Invalid date of birth (future date).");
          return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
        }
      } else {
        console.warn("PROVIDER validation: Date of birth not parsed or provided.");
      }

      // Specific check for Google PROVIDERs requiring extractionComplete
      if (isGoogleAuth && !extractionComplete) {
        console.error("Google PROVIDER validation: extractionComplete flag is false.");
        return NextResponse.json({
          error: "Google PROVIDER verification incomplete. User not saved.",
          missing: ["extractionComplete"]
        }, { status: 400 });
      }
      console.log("PROVIDER-specific validation completed successfully.");
    }

    // Hash the password if provided, otherwise set to null (for Google users)
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    // Create the user in the database
    const user = await prisma.user.create({
      data: {
        email: email || googleUserEmail,
        name: isGoogleAuth ? googleUserName || name : name, // Use Google name if available
        contactPhone: contactPhone || null,
        hashedPassword,
        // --- FIX APPLIED HERE ---
        // Mark Google users as OTP verified automatically.
        // For non-Google users, this depends on the OTP verification flow above.
        isOtpVerified: isGoogleAuth || (!isGoogleAuth && !!otpCode),
        // --- END FIX ---
        isFaceVerified: role === "PROVIDER", // Face verified if role is PROVIDER
        // 'verified' status: true for PROVIDERs if all checks pass, otherwise based on 'verified' from body
        verified: role === "PROVIDER" ? true : !!verified,
        selfieImage: selfieImage || selfieUrl || null,
        idImage: idImage || imageUrl || null,
        faceConfidence: faceConfidence || null,
        idName: idName || null,
        idNumber: idNumber || personalIdNumber || null,
        idDOB: parsedDOB,
        idExpiryDate: parsedExpiry,
        idIssueDate: parsedIssue,
        idIssuer: idIssuer || null,
        personalIdNumber: personalIdNumber || null,
        nationality: nationality || null,
        gender: gender || null,
        placeOfIssue: placeOfIssue || null,
        idType: idType || null,
        rawText: rawText || null
      },
      // Select specific fields to return in the response
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        contactPhone: true,
        isFaceVerified: true,
        verified: true,
        createdAt: true
      }
    });

    console.log(`User ${user.id} (${user.email || user.contactPhone}) created successfully with role ${user.role}. Verified: ${user.verified}. OTP Verified: ${user.isOtpVerified}`);

    // Determine if auto-login should occur for Google PROVIDERs
    const shouldAutoLogin = isGoogleAuth && role === "PROVIDER" && user.verified;
    if (shouldAutoLogin) {
      console.log("Auto-login recommended for this Google PROVIDER.");
    }

    // Return success response
    return NextResponse.json({
      success: true,
      user,
      shouldAutoLogin, // Flag for frontend to initiate auto-login
      message: `${role} account created successfully`
    }, { status: 201 });

  } catch (error: any) {
    // Log detailed error information
    console.error("REGISTRATION ERROR", {
      message: error.message,
      stack: error.stack,
      context: errorContext,
      tookMs: Date.now() - startTime // Time taken for the request
    });

    // Return a generic error response to the client
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
