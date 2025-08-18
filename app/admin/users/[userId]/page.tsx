
export default function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <UserDetail userId={params.id} />;
}