"use client";

import { useState } from "react";
import { Check, Copy, Mail, StatusBadge } from "@tapizlabs/ui";
import { useI18n } from "@/i18n/I18nProvider";
import type { SettingsDialogUser } from "./BoardsSettingsDialog";

interface SettingsProfileCardProps {
  user: SettingsDialogUser;
}

export function SettingsProfileCard({ user }: SettingsProfileCardProps) {
  const { dict } = useI18n();
  const t = dict.settings.account;
  const roleLabel = user.role === "admin" ? dict.admin.roleAdmin : dict.admin.roleMember;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "TB";

  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    if (!user.email) return;
    await navigator.clipboard.writeText(user.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="rounded-xl border border-border bg-ink-200 p-4">
      <div className="kicker mb-3">{t.profileTitle}</div>

      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-lg border border-primary-300/25 bg-primary-300/10 font-display text-sm font-bold text-primary-300">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold text-txt-1">{user.name}</div>

          <div className="mt-1.5">
            <StatusBadge variant="active" label={roleLabel} />
          </div>

          {user.email && (
            <div className="mt-2 flex items-center gap-2">
              <Mail size={13} className="shrink-0 text-primary-300" />
              <span className="min-w-0 truncate text-[12px] text-txt-2" title={user.email}>
                {user.email}
              </span>
              <button
                type="button"
                onClick={copyEmail}
                aria-label={t.copyEmail}
                className="relative ml-auto shrink-0 cursor-pointer border-none bg-transparent p-1 text-txt-4 transition-colors hover:text-primary-300"
              >
                {copied ? <Check size={13} className="text-good" /> : <Copy size={13} />}
                {copied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-hi bg-ink-400 px-2 py-0.5 text-[11px] text-txt-2">
                    {t.copied}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="mt-3 grid gap-1.5 border-t border-border pt-2.5 font-mono text-[10px] text-txt-3">
            <div className="flex items-center gap-2">
              <span className="text-txt-4">{t.membershipLabel}:</span>
              <span className="min-w-0 truncate text-txt-1" title={t.membershipValue}>
                {t.membershipValue}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
