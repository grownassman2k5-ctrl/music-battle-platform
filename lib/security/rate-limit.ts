import "server-only";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const currentBucket = buckets.get(key);

  if (!currentBucket || currentBucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  if (currentBucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((currentBucket.resetAt - now) / 1000),
    };
  }

  currentBucket.count += 1;
  buckets.set(key, currentBucket);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export function getRateLimitKey(request: Request, scope: string) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ipAddress =
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return `${scope}:${ipAddress}`;
}
