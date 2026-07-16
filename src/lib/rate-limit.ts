import { getCloudflareContext } from "@opennextjs/cloudflare";

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

declare global {
  interface CloudflareEnv {
    RATE_LIMITER?: RateLimiter;
  }
}

// IPごと10回/分。バインディングが無い環境（next dev等）では制限なしで通す
export async function checkRateLimit(req: Request, scope: string): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const limiter = env.RATE_LIMITER;
    if (!limiter) return true;
    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    const { success } = await limiter.limit({ key: `${scope}:${ip}` });
    if (!success) console.warn(`rate-limit: blocked ${scope} for ${ip}`);
    return success;
  } catch (err) {
    console.error("rate-limit: check failed", err);
    return true;
  }
}
