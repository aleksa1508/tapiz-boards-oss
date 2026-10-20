"use client";

import { OSSBrandMark } from "@/components/layout/OSSBrandMark";
import { useI18n } from "@/i18n/I18nProvider";

export function AuthLeftPanel() {
  const { dict } = useI18n();
  const t = dict.auth.panel;
  return (
    <aside className="auth-aside hidden flex-col justify-between lg:flex lg:w-[48%]">
      <div className="auth-board-pattern" aria-hidden="true">
        <span className="auth-board-lane"><b /><i /><i /><i /></span>
        <span className="auth-board-lane"><b /><i /><i /></span>
        <span className="auth-board-lane"><b /><i /><i /><i /></span>
      </div>
      <div className="auth-edge-cards" aria-hidden="true"><i /><i /><i /></div>
      {/* Brend */}
      <div className="auth-brand relative z-10 flex items-center gap-3 p-10 animate-fade-in-down">
        <OSSBrandMark size={38} />
        <div>
          <div className="font-display text-[19px] font-bold tracking-tight text-txt-1">
            Tapiz Boards <span className="oss-text-tag">OSS</span>
          </div>
          <div className="auth-product-label mt-0.5 font-mono text-[11px] uppercase tracking-wider">
            {t.tagline}
          </div>
        </div>
      </div>

      {/* Centralni pitch */}
      <div className="auth-pitch relative z-10 flex flex-1 flex-col justify-center px-10 pb-6 animate-scale-in">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-wider text-primary-300">
          {t.kicker}
        </div>
        <h1 className="m-0 mb-4 font-display text-[clamp(2.6rem,4vw,3.4rem)] font-bold leading-[0.98] tracking-[-0.04em] text-txt-1">
          {t.headline1}
          <br />
          {t.headline2}
          <br />
          <span className="auth-accent">{t.headline3}</span>
        </h1>
        <p className="mb-8 max-w-95 text-sm leading-relaxed text-txt-2">{t.description}</p>

        {/* Stat blok */}
        <div className="auth-card auth-workflow grid max-w-115 grid-cols-3">
          {t.stats.map((stat, i) => (
            <div key={stat.value} className={`px-4 py-3.5 ${i > 0 ? "border-l border-border" : ""}`}>
              <div className="font-display text-[13px] font-semibold text-txt-1">{stat.value}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-txt-4">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Feature chip-ovi */}
        <div className="mt-5 flex flex-wrap gap-2">
          {t.chips.map((chip) => (
            <span key={chip} className="auth-chip">
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="auth-aside-footer relative z-10 flex items-center justify-between px-10 py-3 animate-fade-in-up">
        <span className="auth-footer-brand">
          <OSSBrandMark size={25} />
          <span className="auth-footer-copy">
            <strong>Tapiz Boards OSS</strong>
            <small>© {new Date().getFullYear()} Tapiz Labs</small>
          </span>
        </span>
      </div>
    </aside>
  );
}
