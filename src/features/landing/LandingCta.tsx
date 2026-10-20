"use client";

import { ArrowRight, Check, Layers } from "@tapizlabs/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { Eyebrow } from "./primitives/Eyebrow";
import { LandingButton } from "./primitives/LandingButton";

export function LandingCta() {
  const { dict } = useI18n();
  const t = dict.landing.cta;

  return (
    <section className="lp-cta-section" id="cta">
      <div className="lp-container">
        <article className="lp-cta-stage">
          <div className="lp-cta-copy">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h2>{t.title}</h2>
            <p>{t.description}</p>
            <div className="lp-cta-actions">
              <LandingButton href="/login">
                {t.login}<ArrowRight size={16} aria-hidden="true" />
              </LandingButton>
            </div>
          </div>
          <div className="lp-cta-summary">
            <div className="lp-cta-summary-head">
              <span><Layers size={19} /></span>
              <div><strong>Tapiz Boards OSS</strong><small>{t.summaryLabel}</small></div>
            </div>
            <ul>
              {t.points.map((point) => (
                <li key={point}><Check size={14} aria-hidden="true" />{point}</li>
              ))}
            </ul>
          </div>
          <small className="lp-cta-note">{t.note}</small>
        </article>
      </div>
    </section>
  );
}
