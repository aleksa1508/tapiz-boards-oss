import { redirect } from "next/navigation";
import { projectsService } from "@/application/projects.service";
import { REVOKED_SESSION_PATH, resolveSession } from "@/lib/guards";
import { AppShellLayout } from "@/components/layout/AppShellLayout";
import { LandingPage } from "@/features/landing/LandingPage";
import { Dashboard } from "@/features/dashboard/Dashboard";

export default async function HomePage() {
  const session = await resolveSession();
  if (session.kind === "anonymous") return <LandingPage />;
  if (session.kind === "revoked") redirect(REVOKED_SESSION_PATH);

  const { profile } = session;
  const projects = await projectsService.listAll();
  const user = {
    name: `${profile.firstName} ${profile.lastName}`,
    firstName: profile.firstName,
    lastName: profile.lastName,
    role: profile.role,
    email: profile.email,
  };

  return (
    <AppShellLayout user={user}>
      <Dashboard firstName={user.firstName} projects={projects} currentUserId={profile.id} />
    </AppShellLayout>
  );
}
