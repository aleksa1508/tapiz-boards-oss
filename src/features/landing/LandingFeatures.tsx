"use client";

import type { ReactNode } from "react";
import {
  BarChart,
  CheckSquare,
  ExternalLink,
  Layers,
  FileText,
  Zap,
} from "@tapizlabs/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { SectionHeader } from "./primitives/SectionHeader";

const FEATURE_ICONS: ReactNode[] = [
  <Layers key="plan" size={23} />,
  <CheckSquare key="work" size={23} />,
  <FileText key="qa" size={23} />,
  <BarChart key="measure" size={23} />,
  <ExternalLink key="share" size={23} />,
];

export function LandingFeatures() {
  const { dict } = useI18n();
  const t = dict.landing.features;

  return (
    <section className="lp-section lp-features" id="features">
      <div className="lp-container">
        <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
        <ul className="lp-feature-grid">
          {t.items.map((feature, index) => (
            <li key={feature.title} className={`lp-feature-card lp-feature-card-${index + 1}`}>
              <div className="lp-feature-card-head">
                <span className="lp-feature-icon" aria-hidden="true">{FEATURE_ICONS[index]}</span>
                <small>0{index + 1} · {feature.kicker}</small>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              {index === 0 && (
                <div className="lp-mini-backlog" aria-hidden="true">
                  {t.sampleStories.map((title, index) => (
                    <span key={title}><i /> {([8, 5, 3] as const)[index]} SP <b>{title}</b></span>
                  ))}
                </div>
              )}
              {index === 1 && (
                <div className="lp-mini-progress" aria-hidden="true">
                  <span><b>18</b><small>{t.donePointsLabel}</small></span>
                  <div><i /></div>
                  <Zap size={19} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
