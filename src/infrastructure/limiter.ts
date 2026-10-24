import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimiter } from "@/domain/models";
import { hash } from "@/lib/security";
export class UpstashLimiter implements RateLimiter {
  private ip: Ratelimit;
  private email: Ratelimit;
  constructor(url: string, token: string) {
    const redis = new Redis({ url, token });
    this.ip = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      prefix: "crm:ip",
    });
    this.email = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "crm:email",
    });
  }
  async allow(ip: string, email: string) {
    const results = await Promise.all([
      this.ip.limit(hash(ip)),
      this.email.limit(hash(email)),
    ]);
    return results.every((r) => r.success);
  }
}
export class LocalLimiter implements RateLimiter {
  private entries = new Map<string, { count: number; until: number }>();
  async allow(ip: string, email: string) {
    const now = Date.now();
    for (const [key, v] of this.entries)
      if (v.until < now) this.entries.delete(key);
    if (this.entries.size > 5000) this.entries.clear();
    let allowed = true;
    for (const key of [hash(ip), hash(email)]) {
      const value = this.entries.get(key) || { count: 0, until: now + 600000 };
      value.count++;
      this.entries.set(key, value);
      if (value.count > 10) allowed = false;
    }
    return allowed;
  }
}
