import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import authOptions from "@/app/auth/authOptions";

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
  } catch {}
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
    console.log("📦 Registration payload:", JSON.stringify(body, null, 2));
    errorContext.requestBody = body;

    const {
      email,
      name, // This comes from the registration form
      contactPhone,
      password,
      role = "CUSTOMER",
      selfieImage,
      idImage,
      faceConfidence,
      idName, // This comes from ID document extraction
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

    // Determine the name to use - priority to Google name, then form name
    const displayName = isGoogleAuth && googleUserName ? googleUserName : name;

    // Basic validation
    if (!displayName || (!email && !isGoogleAuth)) {
      return NextResponse.json({
        error: "Missing required fields",
        missing: [
          ...(!displayName ? ["name"] : []),
          ...(!email && !isGoogleAuth ? ["email"] : [])
        ]
      }, { status: 400 });
    }

    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    const [existingEmail, existingPhone] = await Promise.all([
      email ? prisma.user.findUnique({ where: { email } }) : null,
      contactPhone ? prisma.user.findUnique({ where: { contactPhone } }) : null
    ]);

    if (!isGoogleAuth && existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    if (existingPhone) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    // Parse dates
    const parsedDOB = idDOB ? parseDate(idDOB) : null;
    const parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
    const parsedIssue = idIssueDate ? parseDate(idIssueDate) : null;

    // Provider-specific validation
    if (role === "PROVIDER") {
      const missing = [];

      if (!selfieImage && !selfieUrl) missing.push("selfieImage");
      if (!idImage && !imageUrl) missing.push("idImage");
      if (!faceConfidence || Number(faceConfidence) < 0.5) missing.push("faceConfidence");
      if (!idName) missing.push("idName");
      if (!idNumber && !personalIdNumber) missing.push("idNumber or personalIdNumber");
      if (!idType) missing.push("idType");

      if (missing.length > 0) {
        return NextResponse.json({
          error: "Missing provider verification data",
          missing,
          payload: body,
          message: "User not saved. Verification incomplete."
        }, { status: 400 });
      }

      if (parsedExpiry && parsedExpiry < new Date()) {
        return NextResponse.json({ error: "ID document has expired" }, { status: 400 });
      }
      if (parsedDOB && parsedDOB > new Date()) {
        return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
      }
      if (isGoogleAuth && !extractionComplete) {
        return NextResponse.json({
          error: "Google PROVIDER is not fully verified. User not saved.",
          missing: ["extractionComplete"],
          payload: body
        }, { status: 400 });
      }
    }

    // Google users: prevent re-registration
    if (isGoogleAuth && googleUserEmail) {
      const existingGoogleUser = await prisma.user.findUnique({ where: { email: googleUserEmail } });
      if (existingGoogleUser) {
        return NextResponse.json({ error: "Google user already exists" }, { status: 409 });
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    const user = await prisma.user.create({
      data: {
        email: email || googleUserEmail,
        name: displayName, // This uses the determined display name
        contactPhone: contactPhone || null,
        hashedPassword,
        role,
        isFaceVerified: role === "PROVIDER",
        verified: role === "PROVIDER" ? true : !!verified,
        selfieImage: selfieImage || selfieUrl || null,
        idImage: idImage || imageUrl || null,
        faceConfidence: faceConfidence || null,
        idName: idName || null, // This stores the extracted ID name separately
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
        id: true,
        email: true,
        name: true, // This will return the display name
        role: true,
        contactPhone: true,
        isFaceVerified: true,
        verified: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      user,
      shouldAutoLogin: isGoogleAuth && role === "PROVIDER" && user.verified,
      message: `${role} account created successfully`
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