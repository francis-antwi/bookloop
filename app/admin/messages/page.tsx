// ✅ app/admin/messages/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/authOptions';
import prisma from '@/app/libs/prismadb';
import Link from 'next/link';

export default async function AdminMessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-center">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (admin?.role !== 'ADMIN') {
    return <div className="p-6 text-center">Access denied</div>;
  }

  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">All Messages</h1>
      <div className="grid gap-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="border rounded p-4 shadow flex justify-between items-center"
          >
            <div>
              <p className="text-sm text-gray-500">
                {msg.sender.name} → {msg.receiver.name}
              </p>
              <p className="text-base">{msg.content}</p>
              <p className="text-xs text-gray-400">
                {new Date(msg.createdAt).toLocaleString()}
              </p>
            </div>
            <Link
              href={`/chat/${msg.sender.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
