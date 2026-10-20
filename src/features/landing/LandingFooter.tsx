"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  CheckSquare,
  ExternalLink,
  FileText,
  GitHubIcon,
  History,
  Layers,
  Lock,
  Server,
  Users,
} from "@tapizlabs/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { Brand } from "./primitives/Brand";

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function FooterLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  const external = isExternalHref(href);
  const pageLink = !href.startsWith("#");
  const content = (
    <>
      <span aria-hidden="true">{icon}</span>
      <span>{children}</span>
      {pageLink && <ExternalLink size={12} aria-hidden="true" />}
    </>
  );
  if (href.startsWith("#")) return <a href={href}>{content}</a>;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }
  return <Link href={href}>{content}</Link>;
}

export function LandingFooter() {
  const { dict } = useI18n();
  const t = dict.landing.footer;

  return (
    <footer className="lp-footer">
      <div className="lp-footer-board-pattern" aria-hidden="true">
        <span className="lp-footer-board-lane"><b /><i /><i /></span>
        <span className="lp-footer-board-lane"><b /><i /><i /><i /></span>
        <span className="lp-footer-board-lane"><b /><i /><i /></span>
      </div>
      <div className="lp-footer-edge-cards" aria-hidden="true"><i /><i /><i /></div>
      <div className="lp-container lp-footer-grid">
        <div className="lp-footer-brand">
          <Brand />
          <p>{t.description}</p>
        </div>
        <nav aria-label={t.product}>
          <strong>{t.product}</strong>
          <FooterLink href="#board" icon={<Layers size={16} />}>
            {t.board}
          </FooterLink>
          <FooterLink href="#features" icon={<CheckSquare size={16} />}>
            {t.features}
          </FooterLink>
          <FooterLink href="#cta" icon={<Users size={16} />}>
            {t.teams}
          </FooterLink>
        </nav>
        <nav aria-label={t.access}>
          <strong>{t.access}</strong>
          <FooterLink href="/login" icon={<Lock size={14} />}>
            {t.login}
          </FooterLink>
          <FooterLink href="https://github.com/owlCoder/tapiz-boards-oss" icon={<GitHubIcon size={14} />}>
            {t.sourceCode}
          </FooterLink>
        </nav>
        <nav aria-label={t.system}>
          <strong>{t.system}</strong>
          <FooterLink href="/changelog" icon={<History size={14} />}>
            {t.changelog}
          </FooterLink>
          <FooterLink href="/status" icon={<Server size={14} />}>
            {t.statusPage}
          </FooterLink>
          <FooterLink href="/privacy-policy" icon={<Lock size={14} />}>
            {dict.legal.privacy.title}
          </FooterLink>
          <FooterLink href="/terms-of-service" icon={<FileText size={14} />}>
            {dict.legal.terms.title}
          </FooterLink>
        </nav>
      </div>
      <div className="lp-container lp-footer-bottom">
        <span>© {new Date().getFullYear()} Tapiz Boards OSS · MIT · {t.rights}</span>
      </div>
    </footer>
  );
}
