import type { Offer, Segment } from './schemas';

const ISO_DURATION_REGEX = /^PT(?:(\d+)H)?(?:(\d+)M)?$/;

type AmadeusOffer = {
  id?: string | number;
  itineraries?: Array<{ segments?: Array<any> }>;
  price?: { grandTotal?: string | number; total?: string | number; currency?: string };
  travelerPricings?: Array<{ fareDetailsBySegment?: Array<{ cabin?: string }> }>;
};

// Normalize Amadeus /v2/shopping/flight-offers response to Offer[]
export function normalizeAmadeusOffers(json: unknown): Offer[] {
  const offers: Offer[] = [];
  const data = Array.isArray((json as { data?: unknown })?.data)
    ? (((json as { data?: unknown }).data as unknown[]) as AmadeusOffer[])
    : [];
  for (const item of data) {
    const itineraries = item?.itineraries ?? [];
    const segments: Segment[] = [];
    let totalMinutes = 0;
    let maxStopsPerDirection = 0;
    for (const itin of itineraries) {
      const itinSegments = Array.isArray(itin?.segments) ? itin.segments : [];
      const stopsForThisItin = Math.max(0, itinSegments.length - 1);
      if (stopsForThisItin > maxStopsPerDirection) maxStopsPerDirection = stopsForThisItin;
      for (const seg of itinSegments) {
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
    const priceAmount = Number(
      item?.price?.grandTotal ?? item?.price?.total ?? 0
    );
    const currency = String(item?.price?.currency ?? 'USD');
    const carriers = new Set<string>();
    for (const s of segments) {
      carriers.add(s.carrier);
    }
    const offer: Offer = {
      id: String(item?.id ?? cryptoRandomId()),
      price: priceAmount,
      currency,
      segments,
      totalDurationMinutes: totalMinutes,
      stops: maxStopsPerDirection,
      cabin: guessCabinFromOffer(item),
      airlines: Array.from(carriers),
      deepLink: null,
    };
    offers.push(offer);
  }
  return offers;
}

function parseIsoDurationToMinutes(iso?: string): number | null {
  if (!iso) {
    return null;
  }
  // Amadeus uses ISO 8601 PTxHxM
  const m = ISO_DURATION_REGEX.exec(iso);
  if (!m) {
    return null;
  }
  const hours = m[1] ? Number(m[1]) : 0;
  const minutes = m[2] ? Number(m[2]) : 0;
  return hours * 60 + minutes;
}

function guessCabinFromOffer(item: AmadeusOffer): string {
  const travelerPricings = item?.travelerPricings ?? [];
  const cabin = travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin;
  return String(cabin ?? 'ECONOMY');
}

function cryptoRandomId(): string {
  // Not cryptographically strong requirement; just a unique-ish id for UI
  const BASE36 = 36;
  const RANDOM_SLICE_START = 2;
  return Math.random().toString(BASE36).slice(RANDOM_SLICE_START) + Date.now().toString(BASE36);
}
