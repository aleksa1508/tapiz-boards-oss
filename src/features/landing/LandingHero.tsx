"use client";

import {
  ArrowRight,
  CheckSquare,
  FileText,
  Users,
  Check,
  GitHubIcon,
} from "@tapizlabs/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { LandingButton } from "./primitives/LandingButton";
import { OSSBrandMark } from "@/components/layout/OSSBrandMark";

export function LandingHero() {
  const { dict } = useI18n();
  const t = dict.landing.hero;

  return (
    <section className="lp-hero" id="board">
      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <div className="lp-hero-badge">
            <span />
            {t.badge}
          </div>
          <span className="lp-hero-eyebrow">{t.eyebrow}</span>
          <h1>
            {t.headline1} <mark>{t.headline2}</mark> {t.headline3}
          </h1>
          <p>{t.description}</p>

          <div className="lp-hero-actions">
            <LandingButton href="/login">
              {t.ctaRegister}
              <ArrowRight size={16} aria-hidden="true" />
            </LandingButton>
            <LandingButton href="https://github.com/owlCoder/tapiz-boards-oss" variant="secondary">
              <GitHubIcon size={16} aria-hidden="true" /> {t.sourceLabel}
            </LandingButton>
          </div>
          <ul className="lp-hero-proofs">
            {t.proofs.map((proof) => (
              <li key={proof}><Check size={15} aria-hidden="true" />{proof}</li>
            ))}
          </ul>
        </div>

        <div className="lp-product-preview" aria-label={t.previewLabel}>
          <div className="lp-preview-chrome">
            <div className="lp-preview-product">
              <OSSBrandMark size={28} />
              <span>
                <strong>Tapiz Boards OSS</strong>
                <small>{t.previewProjectName}</small>
              </span>
            </div>
            <span className="lp-preview-live"><i /> {t.previewSprintLabel}</span>
          </div>

          <div className="lp-preview-tabs" aria-hidden="true">
            <span className="is-active">{dict.board.tabBoard}</span>
            <span>{dict.board.tabBacklog}</span>
            <span>{dict.board.tabSprints}</span>
          </div>
          <div className="lp-preview-toolbar">
            <span><Users size={14} /> 5</span>
            <strong>{t.sprintGoal}</strong>
            <span>18 / 26 SP</span>
          </div>

          <div className="lp-preview-board">
            {t.previewColumns.map((column, columnIndex) => (
              <div className="lp-preview-column" key={column.title}>
                <div className="lp-preview-column-head">
                  <span>{column.title}</span>
                  <b>{column.cards.length}</b>
                </div>
                {column.cards.map((card) => (
                  <article
                    className={`lp-preview-card is-${columnIndex === 1 ? "accent" : columnIndex === 2 ? "success" : "neutral"}`}
                    key={card.title}
                  >
                    <span className="lp-preview-card-kicker">{t.storyLabel}</span>
                    <strong>{card.title}</strong>
                    <small>{card.meta}</small>
                  </article>
                ))}
              </div>
            ))}
          </div>

          <div className="lp-preview-activity">
            <span><CheckSquare size={15} /> {t.previewStatus}</span>
            <span><FileText size={14} /> 12</span>
          </div>
        </div>
      </div>

      <div className="lp-container lp-workflow-strip" aria-label={t.workflowLabel}>
        {t.workflow.map((item, index) => (
          <div key={item.title}>
            <span>0{index + 1}</span>
            <p><strong>{item.title}</strong>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
