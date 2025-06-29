import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

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
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const errorContext: any = {};

  try {
    const session = await getServerSession(authOptions);
    const isLoggedIn = !!session?.user;
    const googleUserEmail = session?.user?.email || null;

    const body = await request.json();
    console.log("\ud83d\udce6 Incoming registration payload:", JSON.stringify(body, null, 2));
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

    const isGoogleAuth = isLoggedIn && !password && !otpCode;

    if (!name || (!email && !isGoogleAuth)) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missing: [
            ...(!name ? ["name"] : []),
            ...(!email && !isGoogleAuth ? ["email"] : [])
          ]
        },
        { status: 400 }
      );
    }

    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    const [existingEmail, existingPhone] = await Promise.all([
      email ? prisma.user.findUnique({ where: { email } }) : Promise.resolve(null),
      contactPhone ? prisma.user.findUnique({ where: { contactPhone } }) : Promise.resolve(null)
    ]);

    if (!isGoogleAuth && existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    if (existingPhone) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    if (!isGoogleAuth && otpCode && contactPhone) {
      const otpVerification = await prisma.oTPVerification.findFirst({
        where: {
          phoneNumber: contactPhone,
          code: otpCode,
          verified: true,
          expiresAt: { gt: new Date() }
        }
      });

      if (!otpVerification) {
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 403 });
      }

      await prisma.oTPVerification.delete({ where: { id: otpVerification.id } });
    }

    let parsedDOB = idDOB ? parseDate(idDOB) : null;
    let parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
    let parsedIssue = idIssueDate ? parseDate(idIssueDate) : null;

    if (role === "PROVIDER") {
      const missing = [];

      if (!selfieImage && !selfieUrl) missing.push("selfieImage");
      if (!idImage && !imageUrl) missing.push("idImage");
      if (!faceConfidence) missing.push("faceConfidence");
      if (!idName) missing.push("idName");
      if (!idNumber && !personalIdNumber) missing.push("idNumber or personalIdNumber");

      if (missing.length) {
        return NextResponse.json({
          error: "Missing provider verification data",
          missing,
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
          success: false,
          skip: true,
          message: "Google PROVIDER is not fully verified. User not saved."
        }, { status: 200 });
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    if (isGoogleAuth && googleUserEmail) {
      const existingGoogleUser = await prisma.user.findUnique({ where: { email: googleUserEmail } });
      if (existingGoogleUser) {
        return NextResponse.json({ error: "Google user already exists" }, { status: 409 });
      }
    }

    const user = await prisma.user.create({
      data: {
        email: email || googleUserEmail,
        name,
        contactPhone: contactPhone || null,
        hashedPassword,
        role,
        isOtpVerified: !isGoogleAuth,
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

    return NextResponse.json({
      success: true,
      user,
      message: `${role} account created successfully`
    }, { status: 201 });

  } catch (error: any) {
    console.error("REGISTRATION ERROR", {
      error: error.message,
      context: errorContext,
      stack: error.stack,
      tookMs: Date.now() - startTime
    });

    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
