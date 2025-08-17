import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import Panel from "./Panel";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/"); // or show 403 page
  }

  return (
    <Panel />
  );
}
