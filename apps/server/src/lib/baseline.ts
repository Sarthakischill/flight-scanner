import type { Offer } from "./schemas";
import { getConvexClient } from "./convex";

// In-memory snapshots for MVP Day 2 (can be swapped to Convex persistence later)
type Snapshot = { price: number; collectedAt: number };
const routeKeySnapshots = new Map<string, Snapshot[]>();

export function computeRouteKey(params: {
  from: string;
  to: string;
  cabin: string;
  stopsBucket: 'direct' | 'one' | 'any';
}) {
  return `${params.from}-${params.to}-${params.cabin}-${params.stopsBucket}`.toUpperCase();
}

export function stopsToBucket(stops: number): 'direct' | 'one' | 'any' {
  if (stops <= 0) return 'direct';
  if (stops === 1) return 'one';
  return 'any';
}

export function recordSnapshots(routeKey: string, offers: Offer[]) {
  const now = Date.now();
  const convex = getConvexClient();
  if (convex) {
    void convex.mutation('recordSnapshots', {
      routeKey,
      items: offers.map((o) => ({ price: o.price, collectedAt: now })),
    });
  }
  const arr = routeKeySnapshots.get(routeKey) ?? [];
  for (const o of offers) arr.push({ price: o.price, collectedAt: now });
  routeKeySnapshots.set(routeKey, arr.slice(-200));
}

export function medianBaseline(routeKey: string): number | undefined {
  const arr = routeKeySnapshots.get(routeKey);
  if (!arr || arr.length === 0) return undefined;
  const prices = arr.map((s) => s.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  if (prices.length % 2 === 0) return (prices[mid - 1] + prices[mid]) / 2;
  return prices[mid];
}

export function readPriceHistory(routeKey: string, days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const arr = routeKeySnapshots.get(routeKey) ?? [];
  return arr.filter((s) => s.collectedAt >= cutoff);
}


