import { type NextRequest, NextResponse } from 'next/server';
import { inspirationSearch } from '@/lib/amadeus';
import { assertRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    assertRateLimit(req);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const date = searchParams.get('date') ?? undefined;
    const MIN_IATA_LEN = 3;
    if (!from || from.length < MIN_IATA_LEN) {
      return NextResponse.json(
        { error: 'from is required (IATA code)' },
        { status: 400 }
      );
    }
    let raw: unknown;
    try {
      raw = await inspirationSearch({
        origin: from,
        departureDate: date,
        oneWay: true,
      });
    } catch (_e) {
      // Retry without date if provider errors
      raw = await inspirationSearch({ origin: from, oneWay: true });
    }
    type DestRaw = {
      destination?: string;
      departureDate?: string;
      returnDate?: string | null;
      price?: { total?: string | number; currency?: string } | number | string;
    };
    const dataArray = Array.isArray((raw as { data?: unknown })?.data)
      ? (((raw as { data?: unknown }).data as unknown[]) as DestRaw[])
      : [];
    const items = dataArray.map((d) => ({
      destination: d?.destination,
      departureDate: d?.departureDate,
      returnDate: d?.returnDate ?? null,
      price: Number((d as any)?.price?.total ?? d?.price ?? 0),
      currency: (d as any)?.price?.currency ?? 'USD',
    }));
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
