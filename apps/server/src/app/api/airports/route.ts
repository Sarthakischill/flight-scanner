import { NextRequest, NextResponse } from "next/server";
import { suggestAirports } from "@/lib/amadeus";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q || q.length < 2) {
      return NextResponse.json({ items: [] });
    }
    const raw = await suggestAirports(q);
    const items = Array.isArray(raw?.data)
      ? raw.data.map((r: any) => ({
          id: r?.id,
          iata: r?.iataCode,
          name: r?.name ?? r?.detailedName,
          city: r?.address?.cityName,
          country: r?.address?.countryCode,
          type: r?.subType,
        }))
      : [];
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


