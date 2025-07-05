import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/authOptions";
import prisma from "@/app/libs/prismadb";

export async function GET(req: NextRequest) {
  const session = await getServerSession({ req, ...authOptions });

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Fetch messages where current user is sender or receiver
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUser.id },
        { receiverId: currentUser.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: true,
      receiver: true,
    },
  });

  const conversationMap = new Map<string, any>();

  for (const msg of messages) {
    const otherUser =
      msg.senderId === currentUser.id ? msg.receiver : msg.sender;
    if (!conversationMap.has(otherUser.id)) {
      conversationMap.set(otherUser.id, {
        user: {
          id: otherUser.id,
          name: otherUser.name,
          image: otherUser.image,
        },
        lastMessage: msg.content,
        timestamp: msg.createdAt,
      });
    }
  }

  const conversations = Array.from(conversationMap.values());

  return NextResponse.json(conversations);
}
