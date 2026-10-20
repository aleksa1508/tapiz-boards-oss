"use client";

import { ExternalLink } from "@tapizlabs/ui";
import { INTL_LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { OSSBrandMark } from "@/components/layout/OSSBrandMark";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString();
const REPO_URL = "https://github.com/owlCoder/tapiz-boards-oss";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3">
      <span className="text-sm font-medium text-txt-2">{label}</span>
      <span className="text-sm font-semibold text-txt-1">{value}</span>
    </div>
  );
}

export function SettingsInfoSection() {
  const { dict, locale } = useI18n();
  const t = dict.settings.info;
  const lastUpdateValue = new Date(BUILD_DATE).toLocaleDateString(INTL_LOCALES[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-lg animate-in fade-in duration-200">
      <div className="mb-8 flex flex-col items-center pt-2 text-center">
        <div className="mb-4 grid h-18 w-18 place-items-center text-txt-1">
          <OSSBrandMark size={56} />
        </div>
        <h2 className="mb-1 text-xl font-bold text-txt-1">{t.productTitle}</h2>
        <p className="max-w-xs text-sm leading-relaxed text-txt-3">{t.productDescription}</p>
        <span className="mt-3 rounded-full border border-primary-300/20 bg-primary-300/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest text-primary-300">
          v{APP_VERSION} · {t.releaseLabel}
        </span>
      </div>

      <div className="mb-6">
        <InfoRow label={t.versionLabel} value={`v${APP_VERSION}`} />
        <InfoRow label={t.environmentLabel} value={t.environmentValue} />
        <InfoRow label={t.platformLabel} value={t.platformValue} />
        <InfoRow label={t.authorLabel} value={t.authorValue} />
        <InfoRow label={t.lastUpdateLabel} value={lastUpdateValue} />
      </div>

      <div className="mb-8 flex flex-col gap-2">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-border bg-ink-100 px-4 py-3 text-sm font-medium text-txt-1 no-underline transition-colors hover:border-primary-300 hover:text-primary-300"
        >
          <span>{t.repoLinkLabel}</span>
          <ExternalLink size={14} />
        </a>
        <a
          href={`${REPO_URL}/issues`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-border bg-ink-100 px-4 py-3 text-sm font-medium text-txt-1 no-underline transition-colors hover:border-primary-300 hover:text-primary-300"
        >
          <span>{t.issuesLinkLabel}</span>
          <ExternalLink size={14} />
        </a>
        <a
          href={`${REPO_URL}/blob/main/LICENSE`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-border bg-ink-100 px-4 py-3 text-sm font-medium text-txt-1 no-underline transition-colors hover:border-primary-300 hover:text-primary-300"
        >
          <span>{t.licenseLinkLabel}</span>
          <ExternalLink size={14} />
        </a>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-txt-4">{t.footerNote}</p>
    </div>
  );
}
