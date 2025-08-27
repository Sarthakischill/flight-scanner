import { NextRequest, NextResponse } from "next/server";
import { inspirationSearch } from "@/lib/amadeus";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const date = searchParams.get("date") ?? undefined;
    if (!from || from.length < 3) {
      return NextResponse.json({ error: "from is required (IATA code)" }, { status: 400 });
    }
    let raw: unknown;
    try {
      raw = await inspirationSearch({ origin: from, departureDate: date, oneWay: true });
    } catch (e) {
      // Retry without date if provider errors
      raw = await inspirationSearch({ origin: from, oneWay: true });
    }
    const dataArray = Array.isArray((raw as any)?.data) ? (raw as any).data : [];
    const items = dataArray.map((d: any) => ({
      destination: d?.destination,
      departureDate: d?.departureDate,
      returnDate: d?.returnDate ?? null,
      price: Number(d?.price?.total ?? d?.price ?? 0),
      currency: d?.price?.currency ?? "USD",
    }));
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


