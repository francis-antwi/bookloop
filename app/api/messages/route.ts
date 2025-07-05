import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/authOptions";
import prisma from "@/app/libs/prismadb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession({ req, ...authOptions });
    const searchParams = req.nextUrl.searchParams;
    const withUserId = searchParams.get("with");

    if (!session?.user?.email || !withUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUser.id, receiverId: withUserId },
          { senderId: withUserId, receiverId: currentUser.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
