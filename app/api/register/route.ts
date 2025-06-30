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
    console.error("Date parsing error:", e);
  }
  return null;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const errorContext: any = {};

  try {
    const session = await getServerSession(authOptions);
    const isGoogleAuth = !!(session?.user && !session.user.password && !session.user.otpCode);
    const googleUserEmail = session?.user?.email || null;
    const googleUserName = session?.user?.name?.trim() || "";

    const body = await request.json();
    console.log("📦 Registration payload received:", JSON.stringify(body, null, 2));
    errorContext.requestBody = body;

    const {
      email,
      name,
      contactPhone,
      password,
      role = "CUSTOMER",
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
      imageUrl,
      selfieUrl,
      nationality,
      gender,
      placeOfIssue,
      idType,
      rawText,
      verified,
      extractionComplete
    } = body;

    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    let user; // Declare user variable outside the if/else for broader scope

    // --- NEW LOGIC: Handle existing Google users as updates ---
    if (isGoogleAuth && googleUserEmail) {
      const existingGoogleUser = await prisma.user.findUnique({ where: { email: googleUserEmail } });

      if (existingGoogleUser) {
        console.log(`Google user ${googleUserEmail} found. Attempting to update profile.`);
        // If user exists, update their profile instead of creating a new one
        // This handles the scenario where a Google user logs in, gets a session,
        // then lands on /role or /verify to complete their profile.
        user = await prisma.user.update({
          where: { email: googleUserEmail },
          data: {
            // Update only the fields that are part of the registration completion
            name: googleUserName || name || existingGoogleUser.name, // Keep existing name if not provided
            contactPhone: contactPhone || existingGoogleUser.contactPhone,
            role, // Update the role
            isOtpVerified: existingGoogleUser.isOtpVerified || isGoogleAuth, // Keep true if already true, or set if Google Auth
            isFaceVerified: role === "PROVIDER" ? true : existingGoogleUser.isFaceVerified, // Set true if PROVIDER, otherwise keep existing
            verified: role === "PROVIDER" ? true : (verified ?? existingGoogleUser.verified), // Set true if PROVIDER, otherwise use provided or existing
            selfieImage: selfieImage || selfieUrl || existingGoogleUser.selfieImage,
            idImage: idImage || imageUrl || existingGoogleUser.idImage,
            faceConfidence: faceConfidence || existingGoogleUser.faceConfidence,
            idName: idName || existingGoogleUser.idName,
            idNumber: idNumber || personalIdNumber || existingGoogleUser.idNumber,
            idDOB: parsedDOB || existingGoogleUser.idDOB,
            idExpiryDate: parsedExpiry || existingGoogleUser.idExpiryDate,
            idIssueDate: parsedIssue || existingGoogleUser.idIssueDate,
            idIssuer: idIssuer || existingGoogleUser.idIssuer,
            personalIdNumber: personalIdNumber || existingGoogleUser.personalIdNumber,
            nationality: nationality || existingGoogleUser.nationality,
            gender: gender || existingGoogleUser.gender,
            placeOfIssue: placeOfIssue || existingGoogleUser.placeOfIssue,
            idType: idType || existingGoogleUser.idType,
            rawText: rawText || existingGoogleUser.rawText,
          },
          select: {
            id: true, email: true, name: true, role: true, contactPhone: true,
            isFaceVerified: true, verified: true, createdAt: true, isOtpVerified: true
          }
        });

      } else {
        // If it's Google Auth but no existing user, proceed with creation (should be rare if signIn callback works)
        // This block handles the initial creation of the user record in the DB for Google users
        // if they somehow bypass the initial creation during NextAuth's signIn callback.
        // However, the primary flow for new Google users should be handled by NextAuth's signIn callback
        // creating a basic user and then redirecting to /role.
        console.log(`Google user ${googleUserEmail} not found, proceeding with initial creation.`);
        user = await prisma.user.create({
          data: {
            email: googleUserEmail,
            name: googleUserName || name,
            contactPhone: contactPhone || null,
            hashedPassword: null, // Google users don't have password
            role,
            isOtpVerified: true, // Google users are considered OTP verified
            isFaceVerified: role === "PROVIDER",
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
          select: {
            id: true, email: true, name: true, role: true, contactPhone: true,
            isFaceVerified: true, verified: true, createdAt: true, isOtpVerified: true
          }
        });
      }
    } else {
      // --- ORIGINAL LOGIC: Handle non-Google (credentials) registration ---
      // Basic validation for non-Google users
      if (!name) {
        return NextResponse.json({
          error: "Missing required fields", missing: ["name"]
        }, { status: 400 });
      }
      if (!email || !password) { // Ensure email and password for non-Google
        return NextResponse.json({
          error: "Missing required fields", missing: ["email", "password"]
        }, { status: 400 });
      }

      const [existingEmail, existingPhone] = await Promise.all([
        prisma.user.findUnique({ where: { email } }),
        contactPhone ? prisma.user.findUnique({ where: { contactPhone } }) : null
      ]);

      if (existingEmail) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
      if (existingPhone) {
        return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
      }

      // OTP Verification (non-Google)
      if (otpCode && contactPhone) {
        const otpVerification = await prisma.oTPVerification.findFirst({
          where: {
            phoneNumber: contactPhone, code: otpCode, verified: true, expiresAt: { gt: new Date() }
          }
        });
        if (!otpVerification) {
          return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 403 });
        }
        await prisma.oTPVerification.delete({ where: { id: otpVerification.id } });
      } else {
        return NextResponse.json({ error: "OTP is required for phone verification" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      user = await prisma.user.create({
        data: {
          email, name, contactPhone, hashedPassword, role,
          isOtpVerified: true, // OTP verified for non-Google users after successful OTP check
          isFaceVerified: role === "PROVIDER",
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
        select: {
          id: true, email: true, name: true, role: true, contactPhone: true,
          isFaceVerified: true, verified: true, createdAt: true, isOtpVerified: true
        }
      });
    }

    // PROVIDER-specific validation (applies to both new and updated PROVIDERs)
    if (role === "PROVIDER") {
      console.log("Initiating PROVIDER-specific validation...");
      const missing = [];

      if (!selfieImage && !selfieUrl) missing.push("selfieImage");
      if (!idImage && !imageUrl) missing.push("idImage");
      if (!faceConfidence || Number(faceConfidence) < 0.5) missing.push("faceConfidence");
      if (!idName) missing.push("idName");
      if (!idNumber && !personalIdNumber) missing.push("idNumber or personalIdNumber");
      if (!idType) missing.push("idType");

      if (missing.length > 0) {
        console.error(`PROVIDER validation failed: Missing required data - ${missing.join(", ")}`);
        // If validation fails for an update, we should revert or indicate failure
        // For now, return error, but consider how to handle partial updates if needed.
        return NextResponse.json({
          error: "Missing provider verification data",
          missing,
          message: "Verification incomplete. User not saved."
        }, { status: 400 });
      }

      if (parsedExpiry && parsedExpiry < new Date()) {
        console.error("PROVIDER validation: ID document has expired.");
        return NextResponse.json({ error: "ID document has expired" }, { status: 400 });
      }
      if (parsedDOB && parsedDOB > new Date()) {
        console.error("PROVIDER validation: Invalid date of birth (future date).");
        return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
      }
      if (isGoogleAuth && !extractionComplete) {
        console.error("Google PROVIDER validation: extractionComplete flag is false.");
        return NextResponse.json({
          error: "Google PROVIDER verification incomplete. User not saved.",
          missing: ["extractionComplete"]
        }, { status: 400 });
      }
      console.log("PROVIDER-specific validation completed successfully.");
    }

    // After successful creation or update, ensure the user object is valid
    if (!user) {
        console.error("REGISTRATION ERROR: User object is null after create/update operation.");
        return NextResponse.json({ error: "Registration failed: User object not created/updated." }, { status: 500 });
    }

    console.log(`User ${user.id} (${user.email || user.contactPhone}) processed successfully with role ${user.role}. Verified: ${user.verified}. OTP Verified: ${user.isOtpVerified}`);

    const shouldAutoLogin = isGoogleAuth && role === "PROVIDER" && user.verified;
    if (shouldAutoLogin) {
      console.log("Auto-login recommended for this Google PROVIDER.");
    }

    return NextResponse.json({
      success: true,
      user,
      shouldAutoLogin,
      message: `${role} account processed successfully` // Changed message to reflect update possibility
    }, { status: 201 });

  } catch (error: any) {
    console.error("REGISTRATION ERROR", {
      message: error.message,
      stack: error.stack,
      context: errorContext,
      tookMs: Date.now() - startTime
    });
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
