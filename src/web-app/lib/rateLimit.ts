/**
 * lib/rateLimit.ts
 *
 * Sliding-window in-memory rate limiter.
 *
 * Works correctly for a single process (local dev, single Vercel instance).
 * For multi-instance production deployments, swap the `windows` Map for a
 * shared store (Upstash Redis / Vercel KV) using the same interface.
 */

type RateLimitOptions = {
  /** Maximum number of requests allowed in the window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

// key → sorted array of hit timestamps (oldest first)
const windows = new Map<string, number[]>();

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  // Prune expired hits
  const hits = (windows.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= opts.max) {
    const retryAfter = Math.ceil((hits[0] + opts.windowMs - now) / 1000);
    return { ok: false, retryAfter };
  }

  hits.push(now);
  windows.set(key, hits);

  // Periodic GC: remove empty buckets when the map grows large
  if (windows.size > 5_000) {
    for (const [k, v] of windows) {
      if (v.every((t) => t <= cutoff)) windows.delete(k);
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters for sensitive endpoints
// ---------------------------------------------------------------------------

/** Wallet deposits — 10 per user per minute */
export function walletDepositLimit(userId: string): RateLimitResult {
  return rateLimit(`wallet:deposit:${userId}`, { max: 10, windowMs: 60_000 });
}

/** KYC submission — 3 per user per hour */
export function kycSubmitLimit(userId: string): RateLimitResult {
  return rateLimit(`kyc:submit:${userId}`, { max: 3, windowMs: 3_600_000 });
}

/** Stage transitions — 30 per user per minute */
export function transitionLimit(userId: string): RateLimitResult {
  return rateLimit(`stage:transition:${userId}`, { max: 30, windowMs: 60_000 });
}

/** Generic API — 60 per user per minute */
export function apiLimit(userId: string, route: string): RateLimitResult {
  return rateLimit(`api:${route}:${userId}`, { max: 60, windowMs: 60_000 });
}
