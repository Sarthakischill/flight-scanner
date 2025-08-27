import type { NextRequest } from 'next/server';

type Bucket = { timestamps: number[] };
const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  // @ts-ignore next runtime may expose ip
  return (req as any).ip ?? 'unknown';
}

export function assertRateLimit(req: NextRequest, limit = 20, windowMs = 60_000) {
  const ip = getClientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip) ?? { timestamps: [] };
  // drop old entries
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - bucket.timestamps[0]);
    const err = new Error('Too many requests');
    (err as any).status = 429;
    (err as any).retryAfter = Math.ceil(retryAfterMs / 1000);
    throw err;
  }
  bucket.timestamps.push(now);
  buckets.set(ip, bucket);
}


