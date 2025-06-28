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
      role,
      selfieImage,
      idImage,
      faceConfidence,
      isFaceVerified,
      idName,
      idNumber,
      idDOB,
      idExpiryDate,
      idIssuer,
      idIssueDate,
      personalIdNumber,
    } = body;

    if (!email || !name || !password || !role || !contactPhone) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const validRoles: UserRole[] = ["CUSTOMER", "PROVIDER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role selected." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    const phoneUser = await prisma.user.findFirst({
      where: { contactPhone, isOtpVerified: true },
    });

    if (!phoneUser) {
      return NextResponse.json({ error: "Phone number must be OTP-verified before registration." }, { status: 403 });
    }

    if (phoneUser.otpExpiresAt && new Date(phoneUser.otpExpiresAt) < new Date()) {
      return NextResponse.json({ error: "OTP expired. Please verify again." }, { status: 403 });
    }

    let parsedDOB = null;
    let parsedExpiry = null;
    let parsedIssueDate = null;

    if (role === "PROVIDER") {
      if (!selfieImage || !idImage || typeof faceConfidence !== "number" || isFaceVerified !== true) {
        return NextResponse.json({ error: "Face verification required before registration." }, { status: 400 });
      }

      if (!idName || !idNumber) {
        return NextResponse.json({ error: "Incomplete ID information extracted." }, { status: 400 });
      }

      parsedDOB = idDOB ? parseDate(idDOB) : null;
      parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
      parsedIssueDate = idIssueDate ? parseDate(idIssueDate) : null;

      if (!parsedDOB) console.warn("⚠️ Invalid DOB parsed:", idDOB);
      if (!parsedExpiry) console.warn("⚠️ Invalid expiry date parsed:", idExpiryDate);
      if (!parsedIssueDate && idIssueDate) console.warn("⚠️ Invalid issue date parsed:", idIssueDate);

      if (parsedDOB && (parsedDOB.getFullYear() < 1900 || parsedDOB.getFullYear() > new Date().getFullYear())) {
        return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
      }

      if (parsedExpiry && (parsedExpiry.getFullYear() < 2020 || parsedExpiry.getFullYear() > 2100)) {
        return NextResponse.json({ error: "Invalid ID expiry date." }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const updatedUser = await prisma.user.update({
      where: { id: phoneUser.id },
      data: {
        email,
        name,
        password: hashedPassword, // ✅ CORRECT FIELD
        role,
        isFaceVerified: role === "PROVIDER" ? true : false,
        selfieImage: role === "PROVIDER" ? selfieImage : undefined,
        idImage: role === "PROVIDER" ? idImage : undefined,
        faceConfidence: role === "PROVIDER" ? faceConfidence : undefined,
        idName: role === "PROVIDER" ? idName : undefined,
        idNumber: role === "PROVIDER" ? idNumber : undefined,
        idDOB: role === "PROVIDER" ? parsedDOB : undefined,
        idExpiryDate: role === "PROVIDER" ? parsedExpiry : undefined,
        idIssueDate: role === "PROVIDER" ? parsedIssueDate : undefined,
        idIssuer: role === "PROVIDER" ? idIssuer : undefined,
        personalIdNumber: role === "PROVIDER" ? personalIdNumber : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isFaceVerified: true,
        selfieImage: true,
        idImage: true,
        faceConfidence: true,
        idName: true,
        idNumber: true,
        idDOB: true,
        idExpiryDate: true,
        idIssueDate: true,
        personalIdNumber: true,
        idIssuer: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser }, { status: 201 });

  } catch (error: any) {
    console.error("🔴 Registration error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
