import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/guards";
import { usersService } from "@/application/users.service";
import { AdminUsersView } from "@/features/admin/AdminUsersView";

export default async function AdminUsersPage() {
  const { user } = await requirePageSession();
  if (user.role !== "admin") notFound();
  const users = await usersService.listAll();
  return <AdminUsersView users={users} currentUserId={user.id} />;
}
