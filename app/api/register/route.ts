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
    } = body;

    // ✅ Validate required fields
    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    // Face verification validation
    if (
      !selfieImage ||
      !idImage ||
      typeof faceConfidence !== "number" ||
      isFaceVerified !== true
    ) {
      return NextResponse.json({ error: "Face verification required before registration" }, { status: 400 });
    }

    // Debug: Log extracted ID fields before validation
    console.log("📄 Extracted ID info:", {
      idName,
      idNumber,
      idDOB,
      idExpiryDate,
      idIssuer,
    });

    if (!idName || !idNumber) {
      return NextResponse.json(
        { error: "Incomplete ID information extracted." },
        { status: 400 }
      );
    }

    // ✅ Role validation
    const validRoles: UserRole[] = ["CUSTOMER", "PROVIDER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role selected" }, { status: 400 });
    }

    // Parse and validate dates
    const parsedDOB = idDOB ? parseDate(idDOB) : null;
    const parsedExpiry = idExpiryDate ? parseDate(idExpiryDate) : null;

    if (!parsedDOB) console.warn("⚠️ Invalid DOB parsed:", idDOB);
    if (!parsedExpiry) console.warn("⚠️ Invalid expiry date parsed:", idExpiryDate);

    if (
      parsedDOB &&
      (parsedDOB.getFullYear() < 1900 ||
        parsedDOB.getFullYear() > new Date().getFullYear())
    ) {
      return NextResponse.json(
        { error: "Invalid date of birth extracted from ID." },
        { status: 400 }
      );
    }

    if (
      parsedExpiry &&
      (parsedExpiry.getFullYear() > 2100 || parsedExpiry.getFullYear() < 2020)
    ) {
      return NextResponse.json({ error: "Invalid ID expiry date." }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        contactPhone,
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
        idIssuer,
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
        idIssuer: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });

  } catch (error: any) {
    console.error("🔴 Registration error:", {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      full: error,
    });

    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
