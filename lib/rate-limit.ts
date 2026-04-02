// Simple sliding-window in-memory rate limiter
// No external dependencies required.
const store = new Map<string, number[]>();

/**
 * @param key       Identifier (IP or user ID)
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window size in milliseconds
 * @returns true if the request is allowed, false if rate-limited
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  store.set(key, hits);
  return true;
}
