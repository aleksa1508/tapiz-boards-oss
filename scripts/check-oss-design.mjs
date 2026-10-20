/**
 * Database-free guard against accidentally mixing hosted purple skins
 * back into the Tapiz Boards OSS design.
 * Run with: npm run test:design
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const load = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const css = ["src/features/landing/landing.css", "src/app/auth.css", "src/app/oss.css"];
const previousBrand = /#(?:7257c7|7759c2|9a83e8|a989f5|1d1724|ef6a70)\b/i;

for (const path of css) {
  assert.doesNotMatch(load(path), previousBrand, "Old hosted-product colors in " + path);
}
const tokens = load("src/app/oss.css");
assert.match(tokens, /:root\s*\{[\s\S]*?--color-primary-300:\s*#0a765c/);
assert.match(tokens, /html\.dark\s*\{[\s\S]*?--color-primary-300:\s*#6ee4af/);
assert.match(tokens, /--color-tint-lavender:\s*#e5f4e9/);
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
  assert.match(dict, /default:\s*"OSS · Jade"/);
}
console.log("OSS design tokens and copy checks passed.");
