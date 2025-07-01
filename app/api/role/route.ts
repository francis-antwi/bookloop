import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret });

  if (!token?.email) {
    return NextResponse.json(
      { error: "Unauthorized", message: "No session or email found" },
      { status: 401 }
    );
  }

  const email = token.email;
  let body: { role?: string } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const normalizedRole = body.role?.toUpperCase();
  if (!normalizedRole) {
    return NextResponse.json(
      { error: "Bad Request", message: "Role is required" },
      { status: 400 }
    );
  }

  if (!["CUSTOMER", "PROVIDER"].includes(normalizedRole)) {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid role provided" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (normalizedRole === "CUSTOMER") {
        const newUser = await prisma.user.create({
          data: {
            email,
            name: token.name ?? "",
            image: token.picture ?? "",
            isOtpVerified: true,
            isFaceVerified: false,
            role: "CUSTOMER",
          },
        });

        return NextResponse.json(
          { success: true, message: "Customer account created", user: newUser },
          { status: 201 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Provider role selected. User will be saved after verification.",
          skipCreate: true,
        },
        { status: 200 }
      );
    }

    if (user.role === normalizedRole) {
      return NextResponse.json(
        { success: true, message: "Role already set", user },
        { status: 200 }
      );
    }

    if (
      normalizedRole === "PROVIDER" &&
      (!user.isFaceVerified || !user.selfieImage || !user.idImage)
    ) {
      return NextResponse.json(
        {
          error: "Verification required",
          message:
            "You must complete ID and face verification before becoming a provider.",
        },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { email },
      data: { role: normalizedRole as UserRole },
    });

    return NextResponse.json(
      { success: true, message: "Role updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[ROLE_API_ERROR]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Something went wrong",
      },
      { status: 500 }
    );
  }
}
