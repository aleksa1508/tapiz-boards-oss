/**
 * Database-free regression guard for the single OSS theme-aware teal palette.
 * Run with: npm run test:design
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const load = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const css = [
  "src/app/globals.css", "src/features/landing/landing.css",
  "src/app/auth.css", "src/app/oss.css",
];
const commercialColors = /#(?:7257c7|7759c2|9a83e8|a989f5|1d1724|ef6a70)\b/i;
const oldGreenColors = /#(?:0a765c|6ee4af|08785d|d1ed8e|cce895)\b/i;
for (const path of css) {
  assert.doesNotMatch(load(path), commercialColors, "Commercial colors in " + path);
  assert.doesNotMatch(load(path), oldGreenColors, "Old green OSS colors in " + path);
}

const globals = load("src/app/globals.css");
assert.match(globals, /html:root:not\(\.dark\)\s*\{[^}]*--color-primary-300:\s*#0b5e66/);
assert.match(globals, /html:root\.dark\s*\{[^}]*--color-primary-300:\s*#499ba3/);
assert.match(globals, /html:root:not\(\.dark\)\s*\{[^}]*--color-ink-000:\s*#f8f9fb/);
assert.match(globals, /html:root\.dark\s*\{[^}]*--color-ink-000:\s*#121417/);
assert.match(globals, /--color-tint-lavender:\s*#f3f4f6/);
assert.ok(
  globals.indexOf("html:root:not(.dark)") > globals.lastIndexOf("/* Mekši skeleton-i"),
  "Root palette must follow upstream UI definitions and local CSS rules",
);
const landing = load("src/features/landing/landing.css");
assert.match(landing, /--lp-accent:\s*var\(--color-primary-300\)/);
assert.match(landing, /--lp-bg:\s*var\(--color-ink-000\)/);
assert.doesNotMatch(landing, /--lp-jade|--lp-lime|#0b5e66|#18343b/);
assert.match(landing, /\.lp-feature-card-2\s*\{[^}]*background:\s*var\(--lp-surface\)/);
assert.match(landing, /\.lp-cta-stage\s*\{[^}]*background:\s*var\(--lp-bg\)/);
assert.match(landing, /\.lp-preview-chrome\s*\{[^}]*background:\s*var\(--lp-surface-hi\)/);
assert.match(landing, /\.lp-page \.btn-primary, \.lp-page \.lp-btn-primary\s*\{[^}]*background:\s*var\(--lp-accent\)/);
assert.match(landing, /\.lp-hero-copy h1 mark\s*\{[^}]*color:\s*inherit/);
assert.doesNotMatch(load("src/app/auth.css"), /radial-gradient\([^\n]*var\(--tapiz-accent\)/);
assert.match(globals, /--color-ink-200:\s*#f3f4f6/);
assert.match(globals, /--color-ink-200:\s*#22262b/);
assert.match(globals, /--color-primary-50:\s*#f3f4f6/);
assert.match(globals, /--color-primary-50:\s*#22262b/);
assert.doesNotMatch(load("src/components/theme/ThemeProvider.tsx"), /TAPIZ_SKINS|setSkin/);
assert.doesNotMatch(load("src/components/layout/AppShellLayout.tsx"), /useApplySkin/);
assert.doesNotMatch(load("src/app/(auth)/layout.tsx"), /<ApplySkin/);

const hero = load("src/features/landing/LandingHero.tsx");
const features = load("src/features/landing/LandingFeatures.tsx");
assert.match(hero, /t\.sourceLabel/);
assert.match(hero, /t\.proofs\.map/);
assert.match(hero, /lp-preview-tabs/);
assert.match(features, /t\.sampleStories\.map/);

for (const language of ["sr", "sr-Cyrl", "en", "fr", "hu"]) {
  const dict = load("src/i18n/dictionaries/" + language + ".ts");
  for (const key of ["sourceLabel:", "proofs:", "sampleStories:", "donePointsLabel:", "skinDesc:"]) {
    assert.ok(dict.includes(key), language + ": missing " + key);
  }
  assert.match(dict, /default:\s*"OSS · Teal"/);
}
console.log("OSS neutral light/dark surfaces, teal accents and copy checks passed.");
