"use client";

import Link from "next/link";
import { ChevronLeft, Gear, LogOut, Palette } from "@tapizlabs/ui";
import { OSSBrandMark } from "@/components/layout/OSSBrandMark";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { fmt } from "@/i18n/config";
import type { AppNavGroup } from "./MobileMoreSheet";

interface AppSidebarProps {
  navGroups: AppNavGroup[];
  collapsed: boolean;
  userInitials: string;
  userName: string;
  roleLabel: string;
  inTeamWorkspace: boolean;
  version: string;
  onToggleCollapsed: () => void;
  onSettings: () => void;
  onAppearance: () => void;
  onLogout: () => void;
}

export function AppSidebar({
  navGroups,
  collapsed,
  userInitials,
  userName,
  roleLabel,
  inTeamWorkspace,
  version,
  onToggleCollapsed,
  onSettings,
  onAppearance,
  onLogout,
}: AppSidebarProps) {
  const { dict } = useI18n();

  const itemClassName = (active: boolean) =>
    `mx-2 flex items-center gap-2.5 rounded-md py-2 text-[13px] no-underline transition-[background,color] duration-100 ${
      active
        ? "bg-primary-300/12 font-semibold text-txt-1"
        : "font-medium text-txt-2 hover:bg-ink-300 hover:text-txt-1"
    } ${collapsed ? "justify-center px-0" : "px-2.5"}`;

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-ink-200 transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      <div className={`flex h-14 shrink-0 items-center border-b border-border1 px-3.5 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <OSSBrandMark size={32} />
            <div className="min-w-0">
              <div className="truncate font-display text-[17px] font-bold tracking-[-0.02em] text-txt-1">Tapiz Boards <span className="oss-text-tag">OSS</span></div>
              <div className="font-mono text-[10px] font-semibold text-primary-300">{fmt(dict.nav.build, { version })}</div>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="flex items-center no-underline">
            <OSSBrandMark size={28} />
          </Link>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {navGroups.map((group) => (
          <div key={String(group.label)}>
            {!collapsed && (
              <div className="px-4 pb-2 pt-3 text-[13px] font-semibold text-txt-2">{group.label}</div>
            )}
            <div className="pb-0.5">
              {group.items.map((item) => (
                <Link
                  key={String(item.label)}
                  href={item.href}
                  className={itemClassName(Boolean(item.active))}
                  title={collapsed ? String(item.label) : undefined}
                >
                  <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center ${item.active ? "text-primary-300" : "text-inherit"}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.active && <span className="ml-auto h-1.25 w-1.25 shrink-0 rounded-full bg-primary-300" />}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-2.5">
        {!collapsed && (
          <div className="mb-1.5 flex items-stretch justify-between gap-2 px-1 py-2">
            <div className="flex min-w-0 items-stretch gap-2">
              <div
                className="my-auto grid h-7 w-7 shrink-0 place-items-center rounded-md font-display text-[11px] font-bold text-primary-300"
                style={{
                  background: "var(--tapiz-accent-soft)",
                  boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-primary-300) 35%, transparent)",
                }}
              >
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-txt-1">{userName}</div>
                <div className="mt-0.5 inline-flex items-center rounded-full border border-primary-300/40 bg-primary-300/10 px-2 py-px text-[11px] font-semibold text-primary-300">
                  {roleLabel}
                </div>
                {inTeamWorkspace && (
                  <div className="mt-1 inline-flex max-w-full items-center truncate rounded-full border border-signal-400/40 bg-tint-peach px-2 py-px text-[11px] font-semibold text-signal-400">
                    {dict.nav.teamWorkspace}
                  </div>
                )}
              </div>
            </div>
            <div className="my-auto flex shrink-0 items-center gap-0.5">
              <button onClick={onLogout} title={dict.nav.logout} className="flex cursor-pointer border-none bg-transparent p-1.5 text-warn">
                <span className="inline-flex h-4 w-4 items-center justify-center"><LogOut size={16} /></span>
              </button>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-2 pb-1">
            <div
              className="grid h-7 w-7 place-items-center rounded-md font-display text-[11px] font-bold text-primary-300"
              style={{
                background: "var(--tapiz-accent-soft)",
                boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-primary-300) 35%, transparent)",
              }}
              title={userName}
            >
              {userInitials}
            </div>
          </div>
        )}

        <div className={`flex items-center ${collapsed ? "flex-col justify-center gap-1.5" : "justify-between"}`}>
          <button type="button" title={dict.nav.settings} onClick={onSettings} className="flex cursor-pointer border-none bg-transparent p-1.5 text-txt-3 hover:text-primary-300">
            <span className="inline-flex h-4 w-4 items-center justify-center"><Gear size={16} /></span>
          </button>

          <LanguageSwitcher variant="compact" collapsed={collapsed} />

          <button type="button" title={dict.settings.nav.appearance} onClick={onAppearance} className="flex cursor-pointer border-none bg-transparent p-1.5 text-txt-3 hover:text-primary-300">
            <span className="inline-flex h-4 w-4 items-center justify-center"><Palette size={16} /></span>
          </button>

          <button type="button" title={collapsed ? dict.settings.expand : dict.settings.collapse} onClick={onToggleCollapsed} className="flex cursor-pointer border-none bg-transparent p-1.5 text-txt-3 hover:text-primary-300">
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <ChevronLeft size={16} className={`transition-transform duration-200 ease-in-out ${collapsed ? "rotate-180" : ""}`} />
            </span>
          </button>

          {collapsed && (
            <button onClick={onLogout} title={dict.nav.logout} className="flex cursor-pointer border-none bg-transparent p-1.5 text-warn">
              <span className="inline-flex h-4 w-4 items-center justify-center"><LogOut size={16} /></span>
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 px-2.5 pb-2 pt-1 text-center text-[11px] font-semibold text-txt-4">
        {collapsed ? "OSS" : "MIT · Open Source · Self-hosted"}
      </div>
    </aside>
  );
}
