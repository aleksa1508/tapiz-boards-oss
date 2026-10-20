"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

export function PublicNav() {
  const pathname = usePathname();
  const { dict } = useI18n();

  return (
    <header
      className="border-b border-border sticky top-0 z-10"
      style={{
        background: "color-mix(in srgb, var(--color-ink-200) 92%, transparent)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <span className="font-display font-bold text-sm truncate text-txt-1">
            Tapiz <span className="text-primary-300">Boards</span> <span className="oss-text-tag">OSS</span>
          </span>
          <span className="text-[10px] font-mono shrink-0 ml-0.5 text-txt-4">{pathname.startsWith("/board/") ? "PUBLIC · READ ONLY" : "OSS / COMMUNITY"}</span>
        </Link>
        <Link
          href="/"
          className="text-sm transition-colors text-txt-3 hover:text-primary-300 shrink-0 ml-4"
        >
          ← {dict.common.backToHome}
        </Link>
      </div>
    </header>
  );
}
