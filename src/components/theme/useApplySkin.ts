"use client";

/** Legacy no-op kept for compatibility with older integrations.
 * OSS uses its own fixed teal palette in src/app/globals.css.
 */
export function useApplySkin(): void {
  // Intentionally inactive: OSS has one shared color system.
  return;
}
