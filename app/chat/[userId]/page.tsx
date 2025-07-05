// ✅ app/chat/[userId]/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/authOptions';
import prisma from '@/app/libs/prismadb';
import ChatWindow from '../chatWindow';


interface Props {
  params: {
    userId: string;
  };
}

export default async function ChatPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-center">You must be signed in to view messages.</div>;
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!currentUser) {
    return <div className="p-6 text-center">User not found.</div>;
  }

  return (
    <div className="p-4">
      <ChatWindow
        withUserId={params.userId}
        sessionUserId={currentUser.id}
      />
    </div>
  );
}
