import { ConvexClient } from 'convex/browser';

const CONVEX_URL = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
let cached: ConvexClient | null = null;

export function getConvexClient() {
  if (!CONVEX_URL) return null;
  if (cached) return cached;
  try {
    cached = new ConvexClient(CONVEX_URL);
    return cached;
  } catch {
    return null;
  }
}


