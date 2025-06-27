import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

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

    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    if (!selfieImage || !idImage || typeof faceConfidence !== "number" || isFaceVerified !== true) {
      return NextResponse.json({ error: "Face verification required before registration." }, { status: 400 });
    }

    if (!idName || !idNumber) {
      return NextResponse.json({ error: "Incomplete ID information extracted." }, { status: 400 });
    }

    const validRoles: UserRole[] = ["CUSTOMER", "PROVIDER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role selected." }, { status: 400 });
    }

    const parsedDOB = idDOB ? parseDate(idDOB) : null;
    const parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;
    const parsedIssueDate = idIssueDate ? parseDate(idIssueDate) : null;

    if (!parsedDOB) console.warn("⚠️ Invalid DOB parsed:", idDOB);
    if (!parsedExpiry) console.warn("⚠️ Invalid expiry date parsed:", idExpiryDate);
    if (!parsedIssueDate && idIssueDate) console.warn("⚠️ Invalid issue date parsed:", idIssueDate);

    if (parsedDOB && (parsedDOB.getFullYear() < 1900 || parsedDOB.getFullYear() > new Date().getFullYear())) {
      return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
    }

    if (parsedExpiry && (parsedExpiry.getFullYear() < 2020 || parsedExpiry.getFullYear() > 2100)) {
      return NextResponse.json({ error: "Invalid ID expiry date." }, { status: 400 });
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

    const hashedPassword = await bcrypt.hash(password, 12);

    const updatedUser = await prisma.user.update({
      where: { id: phoneUser.id },
      data: {
        email,
        name,
        hashedPassword,
        role,
        selfieImage,
        idImage,
        faceConfidence,
        isFaceVerified: true,
        idName,
        idNumber,
        idDOB: parsedDOB,
        idExpiryDate: parsedExpiry,
        idIssueDate: parsedIssueDate,
        idIssuer,
        personalIdNumber,
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

    // ✅ Create JWT
    const token = jwt.sign({ id: updatedUser.id }, process.env.JWT_SECRET!, { expiresIn: "1d" });

    // ✅ Set secure cookie
    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return NextResponse.json({ user: updatedUser, token }, { status: 201 });

  } catch (error: any) {
    console.error("🔴 Registration error:", {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });

    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    }

    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
