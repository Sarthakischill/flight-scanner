import { Offer, Segment } from "./schemas";

// Normalize Amadeus /v2/shopping/flight-offers response to Offer[]
export function normalizeAmadeusOffers(json: any): Offer[] {
  const offers: Offer[] = [];
  const data = Array.isArray(json?.data) ? json.data : [];
  for (const item of data) {
    const itineraries = item?.itineraries ?? [];
    const segments: Segment[] = [];
    let totalMinutes = 0;
    for (const itin of itineraries) {
      for (const seg of itin?.segments ?? []) {
        const departureAt = seg?.departure?.at;
        const arrivalAt = seg?.arrival?.at;
        const carrier = seg?.carrierCode;
        const flightNumber = seg?.number;
        const duration = parseIsoDurationToMinutes(seg?.duration) ?? 0;
        totalMinutes += duration;
        if (departureAt && arrivalAt && carrier) {
          segments.push({
            from: seg?.departure?.iataCode,
            to: seg?.arrival?.iataCode,
            departureAt,
            arrivalAt,
            carrier,
            flightNumber,
            durationMinutes: duration,
          });
        }
      }
    }
    const priceAmount = Number(item?.price?.grandTotal ?? item?.price?.total ?? 0);
    const currency = String(item?.price?.currency ?? "USD");
    const carriers = new Set<string>();
    for (const s of segments) carriers.add(s.carrier);
    const offer: Offer = {
      id: String(item?.id ?? cryptoRandomId()),
      price: priceAmount,
      currency,
      segments,
      totalDurationMinutes: totalMinutes,
      stops: Math.max(0, segments.length - (itineraries.length || 1)),
      cabin: guessCabinFromOffer(item),
      airlines: Array.from(carriers),
      deepLink: null,
    };
    offers.push(offer);
  }
  return offers;
}

function parseIsoDurationToMinutes(iso?: string): number | null {
  if (!iso) return null;
  // Amadeus uses ISO 8601 PTxHxM
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  if (!m) return null;
  const hours = m[1] ? Number(m[1]) : 0;
  const minutes = m[2] ? Number(m[2]) : 0;
  return hours * 60 + minutes;
}

function guessCabinFromOffer(item: any): string {
  const travelerPricings = item?.travelerPricings ?? [];
  const cabin = travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin;
  return String(cabin ?? "ECONOMY");
}

function cryptoRandomId(): string {
  // Not cryptographically strong requirement; just a unique-ish id for UI
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}


