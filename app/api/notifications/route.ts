
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { authOptions } from "@/app/auth/authOptions";


// GET /api/notifications
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { id: true, role: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const notifications = await prisma.notification.findMany({
    where: dbUser.role === "ADMIN"
      ? {} // Admin sees all notifications
      : {
          userId: dbUser.id,
          adminOnly: false, // Filter out admin-only for non-admins
        },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}

// POST /api/notifications
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { id: true, role: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    userId,
    message,
    type,
    email,
    contactPhone,
    adminOnly = false,
  } = body;

  if (!message || !type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      message,
      type,
      email,
      contactPhone,
      adminOnly,
    },
  });

  return NextResponse.json(notification);
}
