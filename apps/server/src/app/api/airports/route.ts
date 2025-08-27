import { type NextRequest, NextResponse } from 'next/server';
import { suggestAirports } from '@/lib/amadeus';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q || q.length < 2) {
      return NextResponse.json({ items: [] });
    }
    const raw = (await suggestAirports(q)) as { data?: unknown };
    type AirportRaw = {
      id?: string;
      iataCode?: string;
      name?: string;
      detailedName?: string;
      address?: { cityName?: string; countryCode?: string };
      subType?: string;
    };
    const arr = Array.isArray(raw.data) ? (raw.data as AirportRaw[]) : [];
    const items = arr.map((r) => ({
      id: r?.id,
      iata: r?.iataCode,
      name: r?.name ?? r?.detailedName,
      city: r?.address?.cityName,
      country: r?.address?.countryCode,
      type: r?.subType,
    }));
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
