import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import authOptions from "@/app/auth/authOptions";

function parseDate(dateStr: string): Date | null {
  // Added console.log to debug date parsing
  console.log(`⚙️ [parseDate]: Attempting to parse date string: "${dateStr}"`);
  try {
    const parts = dateStr.split(/[\/\-\.]/).map(p => p.trim());
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY format
      // Let's ensure consistent YYYY-MM-DD for Date constructor
      let day = parts[0];
      let month = parts[1];
      let year = parts[2];

      // Check for common formats and reorder if necessary (e.g., DD/MM/YYYY)
      // If year is first (like 2002-08-25), it's already YYYY-MM-DD
      // If year is last (like 25/08/2002), assume DD/MM/YYYY
      if (year.length === 4 && parseInt(year) > 1900 && parseInt(year) < 2100) {
        // Likely YYYY-MM-DD or DD/MM/YYYY where year is last
        // If it's DD/MM/YYYY, reorder to YYYY-MM-DD
        if (parseInt(day) > 12 && parseInt(month) <= 12) { // Heuristic: if day > 12, it's likely DD/MM/YYYY
            [day, month, year] = [parts[0], parts[1], parts[2]]; // Keep as is, will be reordered below
        } else if (parseInt(month) > 12) { // If month > 12, it's likely MM/DD/YYYY, but we expect DD/MM/YYYY or YYYY-MM-DD
            // This case might indicate an unexpected format or an error in OCR output
            console.warn(`⚠️ [parseDate]: Unusual month value (${month}) for date string: "${dateStr}"`);
        }
      } else if (day.length === 4 && parseInt(day) > 1900 && parseInt(day) < 2100) {
          // Likely YYYY-MM-DD where year is first
          [year, month, day] = [parts[0], parts[1], parts[2]];
      } else {
          // Default to DD/MM/YYYY if no clear year first pattern
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
    // CRITICAL LOG: Check this output in your server logs!
    console.log("📦 [REGISTER]: Received Registration payload:", JSON.stringify(body, null, 2));
    errorContext.requestBody = body;

    const {
      email,
      name,
      contactPhone,
      password,
      role = "CUSTOMER",
      selfieImage, // This will be the Cloudinary URL from /api/verify
      idImage,     // This will be the Cloudinary URL from /api/verify
      faceConfidence,
      idName,
      idNumber,
      idDOB,
      idExpiryDate,
      idIssuer,
      idIssueDate,
      personalIdNumber,
      // imageUrl and selfieUrl are likely not needed here if /api/verify sends the direct URLs as selfieImage/idImage
      // but keeping them in destructuring for safety if your frontend sends them directly
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

    const displayName = isGoogleAuth && googleUserName ? googleUserName : name;

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

    if (!Object.values(UserRole).includes(role)) {
      console.warn("⚠️ [REGISTER]: Invalid user role provided:", role);
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    const [existingEmail, existingPhone] = await Promise.all([
      email ? prisma.user.findUnique({ where: { email } }) : null,
      contactPhone ? prisma.user.findUnique({ where: { contactPhone } }) : null
    ]);

    if (!isGoogleAuth && existingEmail) {
      console.warn("⚠️ [REGISTER]: Email already registered:", email);
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    if (existingPhone) {
      console.warn("⚠️ [REGISTER]: Phone already registered:", contactPhone);
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    // Parse dates received from the payload
    const parsedDOB = idDOB ? parseDate(idDOB) : null;
    const parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
    const parsedIssue = idIssueDate ? parseDate(idIssueDate) : null;

    // Log parsed dates to confirm they are Date objects or null
    console.log("⚙️ [REGISTER]: Parsed Dates - DOB:", parsedDOB, "Expiry:", parsedExpiry, "Issue:", parsedIssue);


    if (role === "PROVIDER") {
      console.log("⚙️ [REGISTER]: Processing as PROVIDER role. Checking verification data.");
      const missing = [];

      // Note: selfieImage and idImage here refer to the URLs passed from /api/verify
      if (!selfieImage && !selfieUrl) missing.push("selfieImage (URL)");
      if (!idImage && !imageUrl) missing.push("idImage (URL)");
      // Ensure faceConfidence is a number and meets a minimum threshold
      if (typeof faceConfidence !== 'number' || faceConfidence < 0.5) missing.push("faceConfidence (must be >= 0.5)");
      if (!idName) missing.push("idName");
      if (!idNumber && !personalIdNumber) missing.push("idNumber or personalIdNumber");
      if (!idType) missing.push("idType");

      if (missing.length > 0) {
        console.error("❌ [REGISTER ERROR]: Missing provider verification data:", missing);
        return NextResponse.json({
          error: "Missing provider verification data",
          missing,
          payload: body,
          message: "User not saved. Verification incomplete."
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
      // This condition might need adjustment based on your full Google Auth flow
      if (isGoogleAuth && !extractionComplete) {
        console.warn("⚠️ [REGISTER]: Google PROVIDER is not fully verified (extraction not complete).");
        return NextResponse.json({
          error: "Google PROVIDER is not fully verified. User not saved.",
          missing: ["extractionComplete"],
          payload: body
        }, { status: 400 });
      }
    }

    if (isGoogleAuth && googleUserEmail) {
      console.log("⚙️ [REGISTER]: Handling existing Google user for update.");
      const existingGoogleUser = await prisma.user.findUnique({ where: { email: googleUserEmail } });
      if (existingGoogleUser) {
        if (role === "PROVIDER") {
          console.log("⚙️ [REGISTER]: Updating existing Google user to PROVIDER role with verification data.");
          const updated = await prisma.user.update({
            where: { email: googleUserEmail },
            data: {
              role,
              isFaceVerified: true, // Set to true if face match passed
              verified: false, // Initial state, requires admin approval
              requiresApproval: true,
              status: "PENDING_REVIEW",
              selfieImage: selfieImage || selfieUrl || null, // Use selfieImage (from /api/verify) first
              idImage: idImage || imageUrl || null,         // Use idImage (from /api/verify) first
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
              rawText: rawText || null,
              // Business verification data for update path
              businessVerification: role === "PROVIDER" ? {
                upsert: { // Use upsert to create or update the related BusinessVerification record
                  create: {
                    tinNumber: body.tinNumber,
                    registrationNumber: body.registrationNumber,
                    businessName: body.businessName,
                    businessType: body.businessType,
                    businessAddress: body.businessAddress,
                    tinCertificateUrl: body.tinCertificateUrl,
                    incorporationCertUrl: body.incorporationCertUrl,
                    vatCertificateUrl: body.vatCertificateUrl,
                    ssnitCertUrl: body.ssnitCertUrl,
                    verified: false,
                    submittedAt: new Date()
                  },
                  update: {
                    tinNumber: body.tinNumber,
                    registrationNumber: body.registrationNumber,
                    businessName: body.businessName,
                    businessType: body.businessType,
                    businessAddress: body.businessAddress,
                    tinCertificateUrl: body.tinCertificateUrl,
                    incorporationCertUrl: body.incorporationCertUrl,
                    vatCertificateUrl: body.vatCertificateUrl,
                    ssnitCertUrl: body.ssnitCertUrl,
                    submittedAt: new Date() // Update submittedAt on re-submission
                  }
                }
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

          console.log("✅ [REGISTER]: Google PROVIDER updated successfully:", updated.email);
          return NextResponse.json({
            success: true,
            user: updated,
            message: "Google PROVIDER verified and updated successfully"
          }, { status: 200 });
        }

        console.log("✅ [REGISTER]: Google user already exists, no update needed for non-PROVIDER role.");
        return NextResponse.json({ message: "Google user already exists" }, { status: 200 });
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    console.log("⚙️ [REGISTER]: Creating new user record.");
    const user = await prisma.user.create({
      data: {
        email: email || googleUserEmail,
        name: displayName,
        contactPhone: contactPhone || null,
        hashedPassword,
        role,
        isFaceVerified: role === "PROVIDER", // Set to true if provider, will be updated later
        verified: role === "PROVIDER" ? false : !!verified, // Providers need approval
        requiresApproval: role === "PROVIDER",
        status: role === "PROVIDER" ? "PENDING_REVIEW" : "ACTIVE",

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
        rawText: rawText || null,

        // Include this if your Prisma schema supports nested business verification
        businessVerification: role === "PROVIDER" ? {
          create: {
            tinNumber: body.tinNumber,
            registrationNumber: body.registrationNumber,
            businessName: body.businessName,
            businessType: body.businessType,
            businessAddress: body.businessAddress,
            tinCertificateUrl: body.tinCertificateUrl,
            incorporationCertUrl: body.incorporationCertUrl,
            vatCertificateUrl: body.vatCertificateUrl,
            ssnitCertUrl: body.ssnitCertUrl,
            verified: false,
            submittedAt: new Date()
          }
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
      shouldAutoLogin: isGoogleAuth && role === "PROVIDER" && user.verified,
      message: `${role} account created successfully`
    }, { status: 201 });

  } catch (error: any) {
    console.error("❌ [REGISTRATION ERROR]: An unexpected error occurred.", {
      message: error.message,
      stack: error.stack,
      context: errorContext,
      tookMs: Date.now() - startTime
    });

    // Check for Prisma-specific errors
    if (error.code && error.code.startsWith('P')) {
        console.error(`Prisma Error Code: ${error.code}`);
        if (error.code === 'P2002') {
            // Unique constraint violation
            return NextResponse.json({ error: `A user with this ${error.meta?.target} already exists.` }, { status: 409 });
        }
        // Add more specific Prisma error handling if needed
    }

    return NextResponse.json({ error: "Registration failed due to an internal server error." }, { status: 500 });
  }
}
