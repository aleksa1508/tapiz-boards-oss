"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Grid, Layers, Palette, Shield, Trash, UserCheck, Zap } from "@tapizlabs/ui";
import { OSSBrandMark } from "@/components/layout/OSSBrandMark";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { logoutAction } from "@/lib/actions/auth.actions";
import type { Role } from "@/domain/types";
import { BoardsSettingsDialog } from "@/features/settings/BoardsSettingsDialog";
import { SettingsAppearanceSection } from "@/features/settings/SettingsAppearanceSection";
import { MobileMoreSheet, type AppNavGroup } from "@/components/layout/MobileMoreSheet";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidePanel } from "@/components/layout/SidePanel";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

interface AppShellLayoutProps {
  user: {
    name: string;
    firstName: string;
    lastName: string;
    role: Role;
    email?: string;
  };
  children: ReactNode;
}

export function AppShellLayout({ user, children }: AppShellLayoutProps) {
  return <AppShell user={user}>{children}</AppShell>;
}

function AppShell({ user, children }: AppShellLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useI18n();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("tapiz-boards-sidebar-collapsed") === "true";
  });

  const pathSegments = pathname.split("/").filter(Boolean);
  const projectId = pathSegments[0] === "projects" ? pathSegments[1] : null;
  const inProjectWorkspace = projectId !== null;
  const roleLabel = user.role === "admin" ? dict.admin.roleAdmin : dict.admin.roleMember;
  const userInitials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "TB";

  const navGroups = useMemo<AppNavGroup[]>(() => {
    const makeItem = (label: string, href: string, active: boolean, icon: React.ReactNode) => ({
      label,
      href,
      active,
      icon,
      onClick: () => { setMoreSheetOpen(false); router.push(href); },
    });

    const common = [
      makeItem(dict.nav.home, "/", pathname === "/", <Grid size={16} />),
      makeItem(dict.nav.myWork, "/my-work", pathname === "/my-work", <UserCheck size={16} />),
      makeItem(dict.trash.title, "/trash", pathname === "/trash", <Trash size={16} />),
      ...(user.role === "admin"
        ? [makeItem(dict.admin.title, "/admin/users", pathname.startsWith("/admin"), <Shield size={16} />)]
        : []),
    ];
    const workspace = (
      [
        ["board", dict.board.tabBoard, <Grid key="b" size={16} />],
        ["backlog", dict.board.tabBacklog, <Layers key="l" size={16} />],
        ["sprints", dict.board.tabSprints, <Zap key="s" size={16} />],
      ] as const
    ).map(([segment, label, icon]) => {
      const href = projectId !== null ? `/projects/${projectId}/${segment}` : "/";
      const active = projectId !== null && pathname.startsWith(`/projects/${projectId}/${segment}`);
      return makeItem(label, href, active, icon);
    });

    const groups: AppNavGroup[] = [{ label: dict.nav.overview, items: common }];
    if (projectId !== null) {
      groups.push({ label: dict.nav.workspace, items: workspace });
    }
    return groups;
  }, [dict, pathname, router, projectId, user.role]);

  const flatNavItems = navGroups.flatMap((g) => g.items).filter((item) => !item.disabled);
  const mobilePrimaryItems = flatNavItems.slice(0, 4);
  const sheetNavGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((item) => !item.disabled && !mobilePrimaryItems.includes(item)) }))
    .filter((g) => g.items.length > 0);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("tapiz-boards-sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <>
      <div className="min-h-screen bg-(--tapiz-bg-page)">
        <header className="sticky top-0 z-30 border-b border-border bg-ink-200 sm:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5 no-underline">
              <OSSBrandMark size={28} />
              <span className="font-display text-base font-bold tracking-[-0.02em] text-txt-1">
                Tapiz <span className="text-primary-300">Boards</span> <span className="oss-text-tag">OSS</span>
              </span>
            </Link>
            <button
              type="button"
              title={dict.settings.nav.appearance}
              onClick={() => setAppearanceOpen(true)}
              className="flex cursor-pointer border-none bg-transparent p-1.5 text-txt-3 hover:text-primary-300"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center"><Palette size={16} /></span>
            </button>
          </div>
        </header>

        <div className="hidden min-h-screen sm:flex">
          <AppSidebar
            navGroups={navGroups}
            collapsed={sidebarCollapsed}
            userInitials={userInitials}
            userName={user.name}
            roleLabel={roleLabel}
            inTeamWorkspace={inProjectWorkspace}
            version={APP_VERSION}
            onToggleCollapsed={toggleSidebarCollapsed}
            onSettings={() => setSettingsOpen(true)}
            onAppearance={() => setAppearanceOpen(true)}
            onLogout={() => void logoutAction()}
          />
          <main className="min-w-0 flex-1">
            <div className="w-full px-6 py-6">
              <div className="pb-8">{children}</div>
            </div>
          </main>
        </div>

        <main className="sm:hidden">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-24">{children}</div>
        </main>

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 sm:hidden">
          <div className="pointer-events-auto flex items-center justify-around rounded-2xl border border-border bg-ink-200/95 px-3 py-1 shadow-lg backdrop-blur-lg">
            {mobilePrimaryItems.map((item) => (
              <Link
                key={String(item.label)}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-all ${
                  item.active ? "text-primary-300 drop-shadow-sm" : "text-txt-3 hover:text-txt-1"
                }`}
              >
                <span className="flex h-5.5 w-5.5 items-center justify-center [&_svg]:h-5.5 [&_svg]:w-5.5">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setMoreSheetOpen(true)}
              className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-txt-3 transition-colors hover:text-txt-1"
            >
              <span className="flex h-5.5 w-5.5 items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </span>
              <span className="text-[10px] font-medium">{dict.nav.more}</span>
            </button>
          </div>
        </div>
      </div>

      <MobileMoreSheet
        open={moreSheetOpen}
        user={user}
        roleLabel={roleLabel}
        navGroups={sheetNavGroups}
        onClose={() => setMoreSheetOpen(false)}
        onSettings={() => setSettingsOpen(true)}
        onAppearance={() => setAppearanceOpen(true)}
        onLogout={() => void logoutAction()}
      />
      <BoardsSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} />
      <SidePanel
        open={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        title={dict.settings.appearance.title}
        subtitle={dict.settings.appearance.subtitle}
        icon={<Palette size={18} className="text-primary-300" />}
      >
        <SettingsAppearanceSection />
      </SidePanel>
    </>
  );
}
