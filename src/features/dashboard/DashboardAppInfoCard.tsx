"use client";

import Link from "next/link";
import { ArrowRight, Info } from "@tapizlabs/ui";
import { INTL_LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { OSSBrandMark } from "@/components/layout/OSSBrandMark";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString();

/** Kompaktna "o aplikaciji" kartica za dashboard, po uzoru na /ui AppInfoCard. */
export function DashboardAppInfoCard() {
  const { dict, locale } = useI18n();
  const t = dict.settings.info;
  const lastUpdateValue = new Date(BUILD_DATE).toLocaleDateString(INTL_LOCALES[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const infoRows = [
    { label: t.versionLabel, value: `v${APP_VERSION}` },
    { label: t.environmentLabel, value: t.environmentValue },
    { label: t.authorLabel, value: t.authorValue },
    { label: t.lastUpdateLabel, value: lastUpdateValue },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-ink-200">
      <div className="flex items-center justify-between border-b border-border bg-ink-300 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-md border border-primary-300/15 bg-primary-300/10 text-primary-300">
            <Info size={16} />
          </div>
          <span className="text-[11px] font-semibold text-txt-2">Tapiz Boards OSS</span>
        </div>
        <a
          href="/status"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-semibold text-good transition-colors hover:text-primary-300"
        >
          <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-good" />
          {t.statusLinkLabel}
        </a>
      </div>

      <div className="flex flex-col gap-4 bg-ink-200 p-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <OSSBrandMark size={36} />
          <div className="min-w-0">
            <div className="font-display text-sm font-bold leading-tight text-txt-1">Tapiz Boards OSS</div>
            <div className="mt-0.5 truncate text-[11px] leading-snug text-txt-4">{t.productDescription}</div>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-primary-300/30 bg-primary-300/8 px-2 py-0.5 text-[11px] font-semibold text-primary-300">
            {t.releaseLabel}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b border-border py-1.5 last:border-b-0">
              <span className="text-[11px] text-txt-4">{label}</span>
              <span className="text-[11px] font-semibold text-txt-2">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-1.5">
          <Link
            href="/changelog"
            target="_blank"
            className="group flex items-center justify-between rounded-sm border border-border bg-ink-300 px-3 py-2 no-underline transition-colors hover:border-border-hi hover:bg-ink-400"
          >
            <span className="text-[12px] text-txt-2 transition-colors group-hover:text-txt-1">
              {dict.changelog.title}
            </span>
            <ArrowRight size={12} className="text-txt-4 transition-all group-hover:translate-x-0.5 group-hover:text-primary-300" />
          </Link>
          <Link
            href="/status"
            target="_blank"
            className="group flex items-center justify-between rounded-sm border border-border bg-ink-300 px-3 py-2 no-underline transition-colors hover:border-border-hi hover:bg-ink-400"
          >
            <span className="text-[12px] text-txt-2 transition-colors group-hover:text-txt-1">
              {t.statusLinkLabel}
            </span>
            <ArrowRight size={12} className="text-txt-4 transition-all group-hover:translate-x-0.5 group-hover:text-primary-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
