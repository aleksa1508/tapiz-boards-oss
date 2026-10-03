/**
 * Throttles password guessing: after too many failed logins for one email (or
 * from one IP) inside the window, further attempts are refused without checking
 * the password. In-memory and per server instance — warm instances are reused,
 * so it blunts online guessing without needing a shared store or migration.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 10;
const MAX_FAILURES_PER_IP = 50;
const MAX_TRACKED_KEYS = 10_000;

const failures = new Map<string, { count: number; resetAt: number }>();

function current(key: string, now: number): number {
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) return 0;
  return entry.count;
}

function keysFor(email: string, ip: string | null): { key: string; limit: number }[] {
  const keys = [{ key: `email:${email.toLowerCase()}`, limit: MAX_FAILURES_PER_EMAIL }];
  // Without a known client IP, skip the IP bucket rather than lumping everyone together.
  if (ip) keys.push({ key: `ip:${ip}`, limit: MAX_FAILURES_PER_IP });
  return keys;
}

export function isLoginThrottled(email: string, ip: string | null): boolean {
  const now = Date.now();
  return keysFor(email, ip).some(({ key, limit }) => current(key, now) >= limit);
}

export function recordLoginFailure(email: string, ip: string | null): void {
  const now = Date.now();
  if (failures.size > MAX_TRACKED_KEYS) {
    for (const [key, entry] of failures) if (entry.resetAt <= now) failures.delete(key);
  }
  for (const { key } of keysFor(email, ip)) {
    const count = current(key, now);
    failures.set(key, {
      count: count + 1,
      resetAt: count === 0 ? now + WINDOW_MS : failures.get(key)!.resetAt,
    });
  }
}

export function clearLoginFailures(email: string): void {
  failures.delete(`email:${email.toLowerCase()}`);
}

/** First hop of X-Forwarded-For (set by Vercel / the reverse proxy), if present. */
export function clientIp(headers: Headers): string | null {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
}
