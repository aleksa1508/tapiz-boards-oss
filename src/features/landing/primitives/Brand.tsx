"use client";

import Link from "next/link";
import { OSSBrandMark } from "@/components/layout/OSSBrandMark";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="lp-brand" aria-label="Tapiz Boards OSS">
      <span className="lp-brand-mark" aria-hidden="true">
        <OSSBrandMark size={28} />
      </span>
      {!compact && <span className="lp-brand-name">Tapiz Boards <small>OSS / COMMUNITY</small></span>}
    </Link>
  );
}
