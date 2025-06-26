import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      name,
      password,
      selfieImage,
      idImage,
      faceConfidence,
      isFaceVerified,
      role,
    } = body;

    // ✅ Validate all required fields including face verification
    if (
      !email ||
      !name ||
      !password ||
      !selfieImage ||
      !idImage ||
      typeof faceConfidence !== "number" ||
      isFaceVerified !== true
    ) {
      return NextResponse.json(
        { error: "Face verification required before registration" },
        { status: 400 }
      );
    }

    // ✅ Strict role validation
    const validRoles: UserRole[] = ["CUSTOMER", "PROVIDER"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role selected" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
        role: role as UserRole,
        selfieImage,
        idImage,
        faceConfidence,
        isFaceVerified: true,
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
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
