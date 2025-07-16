import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
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

      // Heuristic to determine YYYY-MM-DD from DD/MM/YYYY or YYYY-MM-DD
      if (year.length === 4 && parseInt(year) > 1900 && parseInt(year) < 2100) {
        // If year is last (e.g., 25/08/2002), assume DD/MM/YYYY and reorder
        if (parseInt(day) > 12 && parseInt(month) <= 12) {
            [day, month, year] = [parts[0], parts[1], parts[2]];
        }
      } else if (day.length === 4 && parseInt(day) > 1900 && parseInt(day) < 2100) {
          // If year is first (e.g., 2002-08-25), it's already YYYY-MM-DD
          [year, month, day] = [parts[0], parts[1], parts[2]];
      } else {
          // Default to DD/MM/YYYY if no clear pattern
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
      // role from payload is now less critical, actualRole determined below
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
      verified, // This 'verified' flag from frontend is for identity verification completion
      extractionComplete, // Indicates OCR and face match were successful
      
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
      isFullProviderRegistration // Flag from frontend to indicate full submission
    } = body;

    const displayName = isGoogleAuth && googleUserName ? googleUserName : name;
    // Determine the actual role for this registration/update.
    // If isFullProviderRegistration is true, force role to PROVIDER.
    const actualRole: UserRole = isFullProviderRegistration ? UserRole.PROVIDER : (body.role && Object.values(UserRole).includes(body.role) ? body.role : UserRole.CUSTOMER);
    console.log(`⚙️ [REGISTER]: Determined actualRole: ${actualRole}`);


    if (!displayName || (!email && !isGoogleAuth)) {
      console.warn("⚠️ [REGISTER]: Missing required fields for registration.", { displayName, email, isGoogleAuth });
      return NextResponse.json({
        error: "Missing required fields",
        missing: [
          ...(!displayName ? ["name"] : []),
          ...(!email && !isGoogleAuth ? ["email"] : [])
        ]
      }, { status: 400 });
    }

    if (!Object.values(UserRole).includes(actualRole)) { // Validate actualRole
      console.warn("⚠️ [REGISTER]: Invalid user role provided:", actualRole);
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    const [existingUserByEmail, existingUserByPhone] = await Promise.all([
      email ? prisma.user.findUnique({ where: { email } }) : null,
      contactPhone ? prisma.user.findUnique({ where: { contactPhone } }) : null
    ]);

    if (!isGoogleAuth && existingUserByEmail) {
      console.warn("⚠️ [REGISTER]: Email already registered:", email);
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    if (existingUserByPhone) {
      console.warn("⚠️ [REGISTER]: Phone already registered:", contactPhone);
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    // Parse dates
    const parsedDOB = idDOB ? parseDate(idDOB) : null;
    const parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
    const parsedIssue = idIssueDate ? parseDate(idIssueDate) : null;
    console.log("⚙️ [REGISTER]: Parsed Dates - DOB:", parsedDOB, "Expiry:", parsedExpiry, "Issue:", parsedIssue);

    // Dynamic validation based on actualRole and data presence
    if (actualRole === UserRole.PROVIDER) {
      console.log("⚙️ [REGISTER]: Processing as PROVIDER role. Performing comprehensive validation.");
      const missing = [];

      // Identity verification checks (required for PROVIDER)
      if (!selfieImage) missing.push("selfieImage (URL)");
      if (!idImage) missing.push("idImage (URL)");
      if (typeof faceConfidence !== 'number' || faceConfidence < 0.5) missing.push("faceConfidence (must be >= 0.5)");
      if (!idName) missing.push("idName");
      if (!idNumber && !personalIdNumber) missing.push("idNumber or personalIdNumber");
      if (!idType) missing.push("idType");

      // Business verification checks (required for PROVIDER)
      if (!tinNumber) missing.push("tinNumber");
      if (!businessName) missing.push("businessName");
      if (!businessType) missing.push("businessType");
      if (!tinCertificateUrl) missing.push("tinCertificateUrl"); // Assuming this is required for business

      if (missing.length > 0) {
        console.error("❌ [REGISTER ERROR]: Missing PROVIDER verification data:", missing);
        return NextResponse.json({
          error: "Missing required verification data for Provider role",
          missing,
          payload: body,
          message: "User not saved. Provider verification incomplete."
        }, { status: 400 });
      }

      if (parsedExpiry && parsedExpiry < new Date()) {
        console.warn("⚠️ [REGISTER]: ID document has expired.");
        return NextResponse.json({ error: "ID document has expired" }, { status: 400 });
      }
      if (parsedDOB && parsedDOB > new Date()) {
        console.warn("⚠️ [REGISTER]: Invalid date of birth (future date).");
        return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
      }
      // This check for extractionComplete might be redundant if all data is sent at once.
      if (isGoogleAuth && !extractionComplete && isFullProviderRegistration) {
        console.warn("⚠️ [REGISTER]: Google PROVIDER is not fully verified (extraction not complete).");
        return NextResponse.json({
          error: "Google PROVIDER is not fully verified. User not saved.",
          missing: ["extractionComplete"],
          payload: body
        }, { status: 400 });
      }
    }

    // Prepare data object for Prisma operations, only including fields that are present
    const userData: any = {
      email: email || googleUserEmail,
      name: displayName,
      contactPhone: contactPhone || null,
      role: actualRole, // Use the determined actualRole
      isFaceVerified: (typeof faceConfidence === 'number' && faceConfidence >= 0.5), // Set based on confidence
      verified: actualRole === UserRole.PROVIDER ? false : !!verified, // Providers need admin approval
      requiresApproval: actualRole === UserRole.PROVIDER,
      status: actualRole === UserRole.PROVIDER ? "PENDING_REVIEW" : "ACTIVE",
      businessVerified: actualRole === UserRole.PROVIDER ? false : undefined
    };

    // Conditionally add identity verification fields if present in the current payload
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

    // Prepare business verification data for upsert/create
    const businessVerificationData: any = {};
    let hasBusinessData = false;
    if (tinNumber !== undefined) { businessVerificationData.tinNumber = tinNumber; hasBusinessData = true; }
    if (registrationNumber !== undefined) { businessVerificationData.registrationNumber = registrationNumber; hasBusinessData = true; }
    if (businessName !== undefined) { businessVerificationData.businessName = businessName; hasBusinessData = true; }
    if (businessType !== undefined) { businessVerificationData.businessType = businessType; hasBusinessData = true; }
    if (businessAddress !== undefined) { businessVerificationData.businessAddress = businessAddress; hasBusinessData = true; }
    if (tinCertificateUrl !== undefined) { businessVerificationData.tinCertificateUrl = tinCertificateUrl; hasBusinessData = true; }
    if (incorporationCertUrl !== undefined) { businessVerificationData.incorporationCertUrl = incorporationCertUrl; hasBusinessData = true; }
    if (vatCertificateUrl !== undefined) { businessVerificationData.vatCertificateUrl = vatCertificateUrl; hasBusinessData = true; }
    if (ssnitCertUrl !== undefined) { businessVerificationData.ssnitCertUrl = ssnitCertUrl; hasBusinessData = true; }
    
    // Always set submittedAt for business verification if any business data is present
    if (hasBusinessData) {
      businessVerificationData.submittedAt = new Date();
      businessVerificationData.verified = false; // Initial state for business verification
    }

    if (isGoogleAuth && googleUserEmail) {
      console.log("⚙️ [REGISTER]: Handling existing Google user for update.");
      const existingGoogleUser = await prisma.user.findUnique({ where: { email: googleUserEmail } });
      if (existingGoogleUser) {
        console.log("⚙️ [REGISTER]: Found existing Google user. Proceeding with update.");
        
        const updateData: any = { ...userData };
        // Only include hashedPassword if it's provided (for non-Google registrations or if Google user sets password later)
        if (password) updateData.hashedPassword = await bcrypt.hash(password, 12);

        // Conditionally include businessVerification upsert
        if (actualRole === UserRole.PROVIDER && hasBusinessData) {
          updateData.businessVerification = {
            upsert: { 
              create: {
                ...businessVerificationData,
                // Removed userId here as Prisma automatically handles linking for nested writes
              },
              update: businessVerificationData
            }
          };
        } else if (actualRole !== UserRole.PROVIDER && existingGoogleUser.businessVerification) {
            // If user is no longer a PROVIDER but has business data, consider disconnecting or deleting if intent is clear
            // For now, we'll just not update it. If a PROVIDER downgrades, manual cleanup might be needed or a specific flow.
            console.log("⚙️ [REGISTER]: Existing Google user is not PROVIDER, skipping businessVerification update.");
        }

        const updated = await prisma.user.update({
          where: { email: googleUserEmail },
          data: updateData,
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

        console.log("✅ [REGISTER]: Google user (now PROVIDER or updated) successfully:", updated.email);
        return NextResponse.json({
          success: true,
          user: updated,
          message: "User profile updated successfully with verification data"
        }, { status: 200 });
      }
    }

    // This block is for creating a brand new user (non-Google or first-time Google user without existing record)
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
    if (hashedPassword) userData.hashedPassword = hashedPassword; 

    console.log("⚙️ [REGISTER]: Creating new user record.");

    const user = await prisma.user.create({
      data: {
        ...userData, // Spread all collected user data
        // Only include businessVerification if it's a PROVIDER and business data is present
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
        createdAt: true
      }
    });

    console.log("✅ [REGISTER]: New user created successfully:", user.email);
    return NextResponse.json({
      success: true,
      user,
      shouldAutoLogin: isGoogleAuth && actualRole === UserRole.PROVIDER && user.verified,
      message: `${actualRole} account created successfully`
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
