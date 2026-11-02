import { createHash } from "node:crypto";

const windowMs = 60_000;
const limit = 60;
const buckets = new Map<string, { count: number; expires: number }>();

// Local backstop with bounded memory. Upstash makes the same rule shared across Vercel instances.
export async function rateLimit(request: Request): Promise<{ allowed: boolean; retryAfter: number }> {
  const address = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for") || "unknown" : "local";
  const key = createHash("sha256").update(address).digest("hex").slice(0, 24);
  const now = Date.now();
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const redisKey = `rukia:activity:${key}:${Math.floor(now / windowMs)}`;
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n", "1", redisKey, "60"]),
      cache: "no-store", signal: AbortSignal.timeout(1500) });
    if (!response.ok) throw new Error("RATE_LIMIT_STORAGE_UNAVAILABLE");
    const payload = await response.json();
    if (typeof payload.result !== "number") throw new Error("RATE_LIMIT_STORAGE_UNAVAILABLE");
    return { allowed: payload.result <= limit, retryAfter: Math.ceil((windowMs - now % windowMs) / 1000) };
  }
  for (const [id, bucket] of buckets) if (bucket.expires <= now) buckets.delete(id);
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= 5000) return { allowed: false, retryAfter: 60 };
    bucket = { count: 0, expires: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;
  return { allowed: bucket.count <= limit, retryAfter: Math.ceil((bucket.expires - now) / 1000) };
}
