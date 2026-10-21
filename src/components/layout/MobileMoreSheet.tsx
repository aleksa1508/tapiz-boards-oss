"use client";

import { X } from "@tapizlabs/ui";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { AccountActions } from "./AccountActions";
import { LocaleSelector } from "./LocaleSelector";

export interface AppNavItem {
  label: string;
  active: boolean;
  icon: ReactNode;
  /** Cilj navigacije — desktop sidebar i donji bar renderuju Link (prefetch). */
  href: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface AppNavGroup {
  label: string;
  items: AppNavItem[];
}

interface MobileMoreSheetProps {
  open: boolean;
  user: { name: string; firstName: string; lastName: string };
  roleLabel: string;
  navGroups: AppNavGroup[];
  onClose: () => void;
  onSettings: () => void;
  onAppearance: () => void;
  onLogout: () => void;
}

/* Bottom sheet "Više" meni — porta /ui MobileDrawerSheet šablona na boards. */
export function MobileMoreSheet({
  open,
  user,
  roleLabel,
  navGroups,
  onClose,
  onSettings,
  onAppearance,
  onLogout,
}: MobileMoreSheetProps) {
  const { dict } = useI18n();

  if (!open) return null;

  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "TB";

  return (
    <div className="fixed inset-0 z-80 border-t border-primary-300/15 sm:hidden" onClick={onClose}>
      <div className="absolute inset-0 backdrop-blur-lg transition-all" />
      <div
        className="absolute bottom-0 left-0 right-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-ink-100 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto py-2">
          {/* Header: korisnik + zatvaranje */}
          <div className="relative mb-2 flex items-center gap-3 border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              title={dict.common.close}
              className="absolute right-3 top-3 grid h-8 w-8 cursor-pointer place-items-center border-none bg-transparent text-txt-3 transition-colors hover:text-txt-1"
            >
              <X size={16} />
            </button>
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md font-display text-sm font-bold text-primary-300"
              style={{
                background: "var(--tapiz-accent-soft)",
                boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-primary-300) 35%, transparent)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-txt-1">{user.name}</p>
              <span className="inline-flex items-center rounded-full border border-primary-300 px-2 py-0.5 text-[11px] font-semibold text-primary-300">
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Nalog: podešavanja / tema / odjava */}
          <AccountActions onClose={onClose} onSettings={onSettings} onAppearance={onAppearance} onLogout={onLogout} />

          {/* Jezik: inline izbor umesto dropdowna — ništa se ne seče */}
          <LocaleSelector />

          {/* Preostala navigacija */}
          {navGroups.some((group) => group.items.length > 0) && (
            <div className="mt-2 border-t border-border pt-4">
              {navGroups
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.label} className="mb-5 px-4">
                    <p className="pb-2 text-[11px] font-semibold text-txt-3">{group.label}</p>
                    <div className="space-y-1.5">
                      {group.items.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          disabled={item.disabled}
                          onClick={
                            item.disabled
                              ? undefined
                              : () => {
                                  onClose();
                                  item.onClick?.();
                                }
                          }
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-95 ${
                            item.active
                              ? "border-border-hi bg-ink-300 text-txt-1"
                              : "border-border bg-ink-200 text-txt-3 hover:bg-ink-300 hover:text-txt-1"
                          } ${item.disabled ? "cursor-default opacity-65" : ""}`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center [&_svg]:h-6 [&_svg]:w-6">
                            {item.icon}
                          </span>
                          <span className="text-[13px] font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
