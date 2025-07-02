import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });

  if (!token?.email) {
    return NextResponse.json(
      { error: "Unauthorized", message: "No token or email" },
      { status: 401 }
    );
  }

  const { role } = await req.json();
  const normalizedRole = role?.toUpperCase();

  if (!["CUSTOMER", "PROVIDER"].includes(normalizedRole)) {
    return NextResponse.json(
      { error: "Invalid role" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: token.email },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  if (user.role === normalizedRole) {
    return NextResponse.json(
      { success: true, message: "Role already set", user },
      { status: 200 }
    );
  }

  // Prevent unverified PROVIDERs
  if (
    normalizedRole === "PROVIDER" &&
    (!user.isFaceVerified || !user.selfieImage || !user.idImage)
  ) {
    return NextResponse.json(
      { error: "Face/ID verification required" },
      { status: 403 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: { email: token.email },
    data: { role: normalizedRole as UserRole },
  });

  return NextResponse.json(
    { success: true, message: "Role updated", user: updatedUser },
    { status: 200 }
  );
}
