import { requirePageSession } from "@/lib/guards";
import { AppShellLayout } from "@/components/layout/AppShellLayout";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePageSession();
  return (
    <AppShellLayout
      user={{
        name: `${profile.firstName} ${profile.lastName}`,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role,
        email: profile.email,
      }}
    >
      {children}
    </AppShellLayout>
  );
}
