import { type NextRequest, NextResponse } from 'next/server';
import { computeRouteKey, readPriceHistory } from '@/lib/baseline';
import { getConvexClient } from '@/lib/convex';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ?? '';
    const to = searchParams.get('to') ?? '';
    const cabin = (searchParams.get('cabin') ?? 'economy').toLowerCase();
    const days = Number(searchParams.get('days') ?? '60');
    const stopsBucketParam = (searchParams.get('stops') ?? 'any') as
      | 'direct'
      | 'one'
      | 'any';

    if (from.length !== 3 || to.length !== 3) {
      return NextResponse.json({ error: 'from and to must be IATA codes' }, { status: 400 });
    }
    const routeKey = computeRouteKey({ from, to, cabin, stopsBucket: stopsBucketParam });
    const convex = getConvexClient();
    if (convex) {
      const since = Date.now() - (Number.isFinite(days) ? days : 60) * 24 * 60 * 60 * 1000;
      const items = await convex.query('getPriceHistory', { routeKey, since });
      return NextResponse.json({ items });
    }
    const history = readPriceHistory(routeKey, Number.isFinite(days) ? days : 60);
    return NextResponse.json({ items: history });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


