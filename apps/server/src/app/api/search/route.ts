import { NextRequest, NextResponse } from "next/server";
import { SearchInputSchema } from "@/lib/schemas";
import { searchFlightOffers } from "@/lib/amadeus";
import { normalizeAmadeusOffers } from "@/lib/normalize";
import { scoreOffer } from "@/lib/score";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SearchInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    // Validate dates are within Amadeus acceptable window (future, not too far). Use ~330 days as guard.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const max = new Date(today);
    max.setDate(max.getDate() + 330);
    const depart = new Date(parsed.data.departDate);
    const ret = parsed.data.returnDate ? new Date(parsed.data.returnDate) : null;
    if (Number.isNaN(depart.getTime()) || depart < today || depart > max) {
      return NextResponse.json(
        { error: "departDate must be within the next ~330 days and not in the past" },
        { status: 400 },
      );
    }
    if (ret && (Number.isNaN(ret.getTime()) || ret < today || ret > max)) {
      return NextResponse.json(
        { error: "returnDate must be within the next ~330 days and not in the past" },
        { status: 400 },
      );
    }

    // Fetch from Amadeus
    const raw = await searchFlightOffers(parsed.data);
    const offers = normalizeAmadeusOffers(raw);

    // TODO: integrate baseline from Convex snapshots. For now baseline undefined.
    const scored = offers.map((o) => {
      const s = scoreOffer(o);
      return { ...o, score: s.score, scoreBreakdown: s.breakdown, badges: s.badges };
    });

    // Simple sorting and pagination
    const sorted = [...scored].sort((a, b) => (parsed.data.sortBy === "price" ? a.price - b.price : (b.score ?? 0) - (a.score ?? 0)));
    const start = (parsed.data.page - 1) * parsed.data.perPage;
    const end = start + parsed.data.perPage;
    const pageItems = sorted.slice(start, end);

    return NextResponse.json({ items: pageItems, total: sorted.length, page: parsed.data.page, perPage: parsed.data.perPage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


