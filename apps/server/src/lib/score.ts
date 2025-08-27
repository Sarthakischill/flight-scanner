import { Offer } from "./schemas";

export type ScoreResult = { score: number; breakdown: Record<string, number>; badges: string[]; baselinePrice?: number };

// Simple baseline-less scoring; baseline integration will be added with snapshots
export function scoreOffer(offer: Offer, baselinePrice?: number): ScoreResult {
  const breakdown: Record<string, number> = {};
  const badges: string[] = [];

  // 1) Price delta vs baseline (0-40)
  let pricePoints = 0;
  if (baselinePrice && baselinePrice > 0) {
    const savingsPct = Math.max(0, (baselinePrice - offer.price) / baselinePrice);
    pricePoints = Math.min(40, 40 * (savingsPct / 0.4));
    if (savingsPct >= 0.4) badges.push("amazing deal");
  } else {
    // Without baseline, stay neutral (half of the max to avoid over/under scoring)
    pricePoints = 20;
  }
  breakdown.price = round(pricePoints);

  // 2) Stops/layovers (0-15)
  let stopsPoints = 0;
  if (offer.stops <= 0) stopsPoints = 15;
  else if (offer.stops === 1) stopsPoints = 7;
  else stopsPoints = 0;
  breakdown.stops = stopsPoints;

  // 3) Airline quality (0-10) — static proxy (placeholder: neutral 6)
  const airlinePoints = 6;
  breakdown.airline = airlinePoints;
  // If a known low-tier airline detected, include a badge
  if (isLowTierAirline(offer.airlines)) badges.push("bad airline");

  // 4) Duration vs typical (0-10) — without baseline, favor shorter trips
  const durationPoints = offer.totalDurationMinutes < 8 * 60 ? 10 : offer.totalDurationMinutes < 12 * 60 ? 6 : 3;
  breakdown.duration = durationPoints;

  // 5) Time-of-day (0-10) — placeholder neutral 7
  breakdown.time = 7;

  // 6) Trip length sweet spot (0-10) — placeholder neutral 7
  breakdown.tripLength = 7;

  const total = clamp(0, 100, Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { score: round(total), breakdown, badges, baselinePrice };
}

function isLowTierAirline(airlines: string[]): boolean {
  const lowTier = new Set(["F9", "G4", "NK", "W6"]); // example: Frontier, Allegiant, Spirit, Wizz
  return airlines.some((a) => lowTier.has(a));
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}


