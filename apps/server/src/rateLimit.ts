export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  allow(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    const bucket = this.hits.get(key) ?? [];
    const nextBucket = bucket.filter((hit) => now - hit < windowMs);

    if (nextBucket.length >= limit) {
      const oldest = nextBucket[0] ?? now;
      const retryAfterMs = windowMs - (now - oldest);
      this.hits.set(key, nextBucket);
      return {
        allowed: false,
        retryAfterMs
      };
    }

    nextBucket.push(now);
    this.hits.set(key, nextBucket);
    return {
      allowed: true,
      retryAfterMs: 0
    };
  }
}
