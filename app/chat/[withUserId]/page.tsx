import ChatWindow from '@/app/components/ChatWindow';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/authOptions';

export default async function ChatPage({ params }: { params: { withUserId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <div className="text-red-500">You must be logged in to view this chat.</div>;
  }

  return (
    <div className="p-4">
      <ChatWindow
        sessionUserId={session.user.id}
        withUserId={params.withUserId}
      />
    </div>
  );
}
