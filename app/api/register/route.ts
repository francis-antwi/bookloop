// Updated register API that handles both Google auth and normal registration
// with proper support for partial provider registration

import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole, ServiceCategory } from "@prisma/client";
import { getServerSession } from "next-auth";
import authOptions from "@/app/auth/authOptions";

function parseDate(dateStr: string): Date | null {
  console.log(`⚙️ [parseDate]: Attempting to parse date string: "${dateStr}"`);
  try {
    const parts = dateStr.split(/[\/\-\.]/).map(p => p.trim());
    if (parts.length === 3) {
      let day = parts[0];
      let month = parts[1];
      let year = parts[2];

      if (year.length === 4 && parseInt(year) > 1900 && parseInt(year) < 2100) {
        if (parseInt(day) > 12 && parseInt(month) <= 12) {
          [day, month, year] = [parts[0], parts[1], parts[2]];
        }
      } else if (day.length === 4 && parseInt(day) > 1900 && parseInt(day) < 2100) {
        [year, month, day] = [parts[0], parts[1], parts[2]];
      } else {
        [day, month, year] = [parts[0], parts[1], parts[2]];
      }

      if (year.length === 2) year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
      
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const date = new Date(iso);
      const result = isNaN(date.getTime()) ? null : date;
      console.log(`✅ [parseDate]: Parsed "${dateStr}" to Date object:`, result);
      return result;
    }
  } catch (e) {
    console.error(`❌ [parseDate]: Error parsing date "${dateStr}":`, e);
  }
  console.log(`⚠️ [parseDate]: Failed to parse date: "${dateStr}". Returning null.`);
  return null;
}

// Function to validate and convert businessType to enum values
function validateBusinessType(businessType: any): ServiceCategory[] {
  if (!Array.isArray(businessType)) {
    console.warn("⚠️ [validateBusinessType]: businessType is not an array:", businessType);
    return [];
  }

  const validTypes: ServiceCategory[] = [];
  
  for (const type of businessType) {
    // Check if the type is already a valid enum value
    if (Object.values(ServiceCategory).includes(type as ServiceCategory)) {
      validTypes.push(type as ServiceCategory);
      continue;
    }
    
    // Try to convert string to enum value
    const normalizedType = type.toUpperCase().replace(/\s+/g, '_');
    if (Object.values(ServiceCategory).includes(normalizedType as ServiceCategory)) {
      validTypes.push(normalizedType as ServiceCategory);
    } else {
      console.warn(`⚠️ [validateBusinessType]: Invalid business type: ${type}`);
    }
  }
  
  return validTypes;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const errorContext: any = {};

  try {
    const session = await getServerSession(authOptions);
    const isGoogleAuth = !!(session?.user && !session.user.password);
    const googleUserEmail = session?.user?.email || null;
    const googleUserName = session?.user?.name || null;

    const body = await request.json();
    console.log("📦 [REGISTER]: Received Registration payload:", JSON.stringify(body, null, 2));
    errorContext.requestBody = body;

    const {
      email,
      name,
      contactPhone,
      password,
      role,
      // Verification fields (for complete provider registration)
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
      nationality,
      gender,
      placeOfIssue,
      idType,
      rawText,
      verified,
      extractionComplete,
      
      // Business fields
      tinNumber,
      registrationNumber,
      businessName,
      businessType,
      businessAddress,
      tinCertificateUrl,
      incorporationCertUrl,
      vatCertificateUrl,
      ssnitCertUrl,
      
      // Special flags
      isPartialRegistration, // Flag to indicate this is just basic info
      isFullProviderRegistration // Flag for complete provider registration
    } = body;

    // Determine user info based on auth type
    const userEmail = email || googleUserEmail;
    const userName = isGoogleAuth && googleUserName ? googleUserName : name;
    
    // Determine the actual role
    const actualRole: UserRole = role && Object.values(UserRole).includes(role) ? role : UserRole.CUSTOMER;
    console.log(`⚙️ [REGISTER]: Determined actualRole: ${actualRole}, isGoogleAuth: ${isGoogleAuth}`);

    // Basic validation
    if (!userName || !userEmail) {
      console.warn("⚠️ [REGISTER]: Missing required fields for registration.", { userName, userEmail });
      return NextResponse.json({
        error: "Missing required fields",
        missing: [
          ...(!userName ? ["name"] : []),
          ...(!userEmail ? ["email"] : [])
        ]
      }, { status: 400 });
    }

    if (!Object.values(UserRole).includes(actualRole)) {
      console.warn("⚠️ [REGISTER]: Invalid user role provided:", actualRole);
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    // Check for existing users
    const [existingUserByEmail, existingUserByPhone] = await Promise.all([
      userEmail ? prisma.user.findUnique({ where: { email: userEmail } }) : null,
      contactPhone ? prisma.user.findUnique({ where: { contactPhone } }) : null
    ]);

    // For Google auth, we might be updating an existing user
    const isUpdatingGoogleUser = isGoogleAuth && existingUserByEmail;

    if (!isGoogleAuth && existingUserByEmail) {
      console.warn("⚠️ [REGISTER]: Email already registered:", userEmail);
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    if (existingUserByPhone && (!isUpdatingGoogleUser || existingUserByPhone.id !== existingUserByEmail?.id)) {
      console.warn("⚠️ [REGISTER]: Phone already registered:", contactPhone);
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    // Parse dates
    const parsedDOB = idDOB ? parseDate(idDOB) : null;
    const parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
    const parsedIssue = idIssueDate ? parseDate(idIssueDate) : null;

    // Validate and convert businessType to enum values
    const validatedBusinessType = validateBusinessType(businessType);
    if (businessType && validatedBusinessType.length === 0) {
      console.warn("⚠️ [REGISTER]: No valid business types provided:", businessType);
      return NextResponse.json({ 
        error: "Invalid business types provided",
        validTypes: Object.values(ServiceCategory)
      }, { status: 400 });
    }

    // Check if this is a full provider registration with verification data
    const hasVerificationData = !!(selfieImage || idImage || tinNumber || businessName);
    const isFullVerification = isFullProviderRegistration && hasVerificationData;

    // Validation based on registration type
    if (actualRole === UserRole.PROVIDER && isFullVerification) {
      console.log("⚙️ [REGISTER]: Processing as PROVIDER with full verification data.");
      const missing = [];

      // Identity verification checks
      if (!selfieImage) missing.push("selfieImage (URL)");
      if (!idImage) missing.push("idImage (URL)");
      if (typeof faceConfidence !== 'number' || faceConfidence < 0.5) missing.push("faceConfidence (must be >= 0.5)");
      if (!idName) missing.push("idName");
      if (!idNumber && !personalIdNumber) missing.push("idNumber or personalIdNumber");
      if (!idType) missing.push("idType");

      // Business verification checks
      if (!tinNumber) missing.push("tinNumber");
      if (!businessName) missing.push("businessName");
      if (validatedBusinessType.length === 0) missing.push("businessType");
      if (!tinCertificateUrl) missing.push("tinCertificateUrl");

      if (missing.length > 0) {
        console.error("❌ [REGISTER ERROR]: Missing PROVIDER verification data:", missing);
        return NextResponse.json({
          error: "Missing required verification data for Provider role",
          missing,
          message: "Provider verification incomplete."
        }, { status: 400 });
      }

      // Additional validation for complete registration
      if (parsedExpiry && parsedExpiry < new Date()) {
        console.warn("⚠️ [REGISTER]: ID document has expired.");
        return NextResponse.json({ error: "ID document has expired" }, { status: 400 });
      }
      if (parsedDOB && parsedDOB > new Date()) {
        console.warn("⚠️ [REGISTER]: Invalid date of birth (future date).");
        return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
      }
    }

    // Prepare base user data
    const userData: any = {
      email: userEmail,
      name: userName,
      contactPhone: contactPhone || null,
      role: actualRole,
    };

    // Set verification status based on role and registration type
    if (actualRole === UserRole.PROVIDER) {
      if (isFullVerification) {
        // Complete provider registration
        userData.isFaceVerified = (typeof faceConfidence === 'number' && faceConfidence >= 0.5);
        userData.verified = false; // Still needs admin approval
        userData.requiresApproval = true;
        userData.status = "PENDING_REVIEW";
        userData.businessVerified = false;
      } else {
        // Partial provider registration (basic info only)
        userData.isFaceVerified = false;
        userData.verified = false;
        userData.requiresApproval = true;
        userData.status = "PENDING_VERIFICATION"; // Different status for incomplete
        userData.businessVerified = false;
      }
    } else {
      // Customer registration
      userData.isFaceVerified = false;
      userData.verified = true;
      userData.requiresApproval = false;
      userData.status = "ACTIVE";
      userData.businessVerified = undefined;
    }

    // Add verification fields if present
    if (selfieImage !== undefined) userData.selfieImage = selfieImage;
    if (idImage !== undefined) userData.idImage = idImage;
    if (faceConfidence !== undefined) userData.faceConfidence = faceConfidence;
    if (idName !== undefined) userData.idName = idName;
    if (idNumber !== undefined) userData.idNumber = idNumber;
    if (parsedDOB !== null) userData.idDOB = parsedDOB;
    if (parsedExpiry !== null) userData.idExpiryDate = parsedExpiry;
    if (parsedIssue !== null) userData.idIssueDate = parsedIssue;
    if (idIssuer !== undefined) userData.idIssuer = idIssuer;
    if (personalIdNumber !== undefined) userData.personalIdNumber = personalIdNumber;
    if (nationality !== undefined) userData.nationality = nationality;
    if (gender !== undefined) userData.gender = gender;
    if (placeOfIssue !== undefined) userData.placeOfIssue = placeOfIssue;
    if (idType !== undefined) userData.idType = idType;
    if (rawText !== undefined) userData.rawText = rawText;

    // Prepare business verification data
    const businessVerificationData: any = {};
    let hasBusinessData = false;
    if (tinNumber !== undefined) { businessVerificationData.tinNumber = tinNumber; hasBusinessData = true; }
    if (registrationNumber !== undefined) { businessVerificationData.registrationNumber = registrationNumber; hasBusinessData = true; }
    if (businessName !== undefined) { businessVerificationData.businessName = businessName; hasBusinessData = true; }
    if (validatedBusinessType.length > 0) { businessVerificationData.businessType = validatedBusinessType; hasBusinessData = true; }
    if (businessAddress !== undefined) { businessVerificationData.businessAddress = businessAddress; hasBusinessData = true; }
    if (tinCertificateUrl !== undefined) { businessVerificationData.tinCertificateUrl = tinCertificateUrl; hasBusinessData = true; }
    if (incorporationCertUrl !== undefined) { businessVerificationData.incorporationCertUrl = incorporationCertUrl; hasBusinessData = true; }
    if (vatCertificateUrl !== undefined) { businessVerificationData.vatCertificateUrl = vatCertificateUrl; hasBusinessData = true; }
    if (ssnitCertUrl !== undefined) { businessVerificationData.ssnitCertUrl = ssnitCertUrl; hasBusinessData = true; }
    
    if (hasBusinessData) {
      businessVerificationData.submittedAt = new Date();
      businessVerificationData.verified = false;
    }

    // Handle Google auth user update
    if (isUpdatingGoogleUser) {
      console.log("⚙️ [REGISTER]: Updating existing Google user.");
      
      const updateData: any = { ...userData };
      
      // Add password if provided (Google user setting password)
      if (password && !isGoogleAuth) {
        updateData.hashedPassword = await bcrypt.hash(password, 12);
      }

      // Add business verification if applicable
      if (actualRole === UserRole.PROVIDER && hasBusinessData) {
        updateData.businessVerification = {
          upsert: { 
            create: businessVerificationData,
            update: businessVerificationData
          }
        };
      }

      const updated = await prisma.user.update({
        where: { email: userEmail },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          contactPhone: true,
          isFaceVerified: true,
          verified: true,
          status: true,
          createdAt: true
        }
      });

      console.log("✅ [REGISTER]: Google user updated successfully:", updated.email);
      return NextResponse.json({
        success: true,
        user: updated,
        shouldAutoLogin: true,
        requiresVerification: actualRole === UserRole.PROVIDER && !isFullVerification,
        message: getSuccessMessage(actualRole, isFullVerification, true)
      }, { status: 200 });
    }

    // Create new user (normal registration or first-time Google user)
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
    if (hashedPassword) userData.hashedPassword = hashedPassword;

    console.log("⚙️ [REGISTER]: Creating new user record.");

    const user = await prisma.user.create({
      data: {
        ...userData,
        businessVerification: actualRole === UserRole.PROVIDER && hasBusinessData ? {
          create: businessVerificationData
        } : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        contactPhone: true,
        isFaceVerified: true,
        verified: true,
        status: true,
        createdAt: true
      }
    });

    console.log("✅ [REGISTER]: New user created successfully:", user.email);
    return NextResponse.json({
      success: true,
      user,
      shouldAutoLogin: true, // Allow auto-login for all successful registrations
      requiresVerification: actualRole === UserRole.PROVIDER && !isFullVerification,
      message: getSuccessMessage(actualRole, isFullVerification, false)
    }, { status: 201 });

  } catch (error: any) {
    console.error("❌ [REGISTRATION ERROR]: An unexpected error occurred.", {
      message: error.message,
      stack: error.stack,
      context: errorContext,
      tookMs: Date.now() - startTime
    });

    if (error.code && error.code.startsWith('P')) {
      console.error(`Prisma Error Code: ${error.code}`);
      if (error.code === 'P2002') {
        return NextResponse.json({ error: `A user with this ${error.meta?.target} already exists.` }, { status: 409 });
      }
    }

    return NextResponse.json({ error: "Registration failed due to an internal server error." }, { status: 500 });
  }
}

function getSuccessMessage(role: UserRole, isFullVerification: boolean, isUpdate: boolean): string {
  if (role === UserRole.PROVIDER) {
    if (isFullVerification) {
      return isUpdate ? "Provider verification submitted successfully. Awaiting admin approval." : "Provider account created with verification. Awaiting admin approval.";
    } else {
      return isUpdate ? "Provider account updated. Please complete verification." : "Provider account created. Please complete verification.";
    }
  } else {
    return isUpdate ? "Customer account updated successfully." : "Customer account created successfully.";
  }
}