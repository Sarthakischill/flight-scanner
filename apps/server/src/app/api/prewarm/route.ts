import { type NextRequest, NextResponse } from 'next/server';
import { searchFlightOffers } from '@/lib/amadeus';
import { normalizeAmadeusOffers } from '@/lib/normalize';
import {
  computeRouteKey,
  recordSnapshots,
  stopsToBucket,
} from '@/lib/baseline';

function isoDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<{
      from: string;
      pairs: Array<{ to: string }>;
    }>;
    const from = (body.from ?? 'LAX').toUpperCase();
    const pairs = body.pairs ?? [{ to: 'NRT' }, { to: 'JFK' }, { to: 'LHR' }];

    const departDate = isoDatePlus(45);
    const returnDate = isoDatePlus(52);

    const results: Array<{ to: string; count: number }> = [];
    for (const { to } of pairs) {
      const raw = await searchFlightOffers({
        roundTrip: true,
        from,
        to: to.toUpperCase(),
        departDate,
        returnDate,
        travelers: 1,
        cabin: 'economy',
        maxStops: 'any',
        page: 1,
        perPage: 20,
        sortBy: 'price',
      } as any);
      const offers = normalizeAmadeusOffers(raw);
      const minStops = offers.length ? Math.min(...offers.map((o) => o.stops)) : 0;
      const routeKey = computeRouteKey({
        from,
        to: to.toUpperCase(),
        cabin: 'economy',
        stopsBucket: stopsToBucket(minStops),
      });
      recordSnapshots(routeKey, offers);
      results.push({ to: to.toUpperCase(), count: offers.length });
    }

    return NextResponse.json({ ok: true, from, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


