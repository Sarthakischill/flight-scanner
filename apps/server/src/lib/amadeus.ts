import { z } from "zod";
import { SearchInputSchema } from "./schemas";

const AMADEUS_BASE_URL = process.env.AMADEUS_BASE_URL ?? "https://test.api.amadeus.com";
// Support both naming schemes: API_KEY/SECRET and CLIENT_ID/CLIENT_SECRET
const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || process.env.AMADEUS_CLIENT_ID;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || process.env.AMADEUS_CLIENT_SECRET;

type OAuthTokenResponse = {
  token_type: string;
  expires_in: number; // seconds
  access_token: string;
};

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAtMs - 30_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", AMADEUS_API_KEY ?? "");
  body.set("client_secret", AMADEUS_API_SECRET ?? "");

  const res = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    // @ts-expect-error: Next.js fetch options aren't fully typed here, but runtime is fine
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus OAuth failed: ${res.status} ${res.statusText} — ${text}`);
  }
  const json = (await res.json()) as OAuthTokenResponse;
  cachedToken = {
    accessToken: json.access_token,
    expiresAtMs: now + (json.expires_in - 30) * 1000,
  };
  return cachedToken.accessToken;
}

async function amadeusFetch(path: string, init?: RequestInit & { query?: Record<string, string | number | boolean | undefined> }) {
  const token = await getAccessToken();
  const url = new URL(path.startsWith("http") ? path : `${AMADEUS_BASE_URL}${path}`);
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": init?.headers?.["Content-Type"] ?? (init?.method === "POST" ? "application/json" : "application/json"),
      ...(init?.headers ?? {}),
    },
    body: init?.body,
    // @ts-expect-error Next fetch
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus API ${url.pathname} failed: ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json();
}

export type SearchInput = z.infer<typeof SearchInputSchema>;

// Amadeus flight offers search
export async function searchFlightOffers(input: SearchInput) {
  const nonStop = input.maxStops === "direct" ? true : undefined;
  const adults = input.travelers ?? 1;
  const travelClassMap: Record<string, string> = {
    economy: "ECONOMY",
    premium_economy: "PREMIUM_ECONOMY",
    business: "BUSINESS",
    first: "FIRST",
  };

  const payload = {
    currencyCode: "USD",
    originDestinations: [
      {
        id: "1",
        originLocationCode: input.from,
        destinationLocationCode: input.to ?? undefined,
        departureDateTimeRange: {
          date: input.departDate,
        },
      },
      ...(input.roundTrip && input.to
        ? [
            {
              id: "2",
              originLocationCode: input.to,
              destinationLocationCode: input.from,
              departureDateTimeRange: {
                date: input.returnDate ?? input.departDate,
              },
            },
          ]
        : []),
    ].filter(Boolean),
    travelers: [
      {
        id: "1",
        travelerType: "ADULT",
      },
      // NOTE: MVP supports only adults in the body; extend for children/infants later
    ],
    sources: ["GDS"],
    searchCriteria: {
      maxFlightOffers: 50,
      flightFilters: {
        connectionRestriction: nonStop ? { maxNumberOfConnections: 0 } : undefined,
        carrierRestrictions: undefined,
        cabinRestrictions: [
          {
            cabin: travelClassMap[input.cabin],
            coverage: "MOST_SEGMENTS",
            originDestinationIds: ["1"].concat(input.roundTrip && input.to ? ["2"] : []),
          },
        ],
      },
    },
  } as const;

  // Adjust travelers array length to adults count
  (payload.travelers as Array<{ id: string; travelerType: string }>).length = adults;
  for (let i = 0; i < adults; i++) {
    (payload.travelers as Array<{ id: string; travelerType: string }>)[i] = {
      id: String(i + 1),
      travelerType: "ADULT",
    };
  }

  const json = await amadeusFetch("/v2/shopping/flight-offers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return json as unknown;
}

// Amadeus locations (airports/cities) suggest
export async function suggestAirports(query: string) {
  const json = await amadeusFetch("/v1/reference-data/locations", {
    query: {
      subType: "AIRPORT,CITY",
      keyword: query,
      "page[limit]": 10,
      view: "LIGHT",
    } as Record<string, string | number>,
  });
  return json as unknown;
}

export { amadeusFetch, getAccessToken };

// Inspiration (anywhere) search
export async function inspirationSearch(params: { origin: string; departureDate?: string; oneWay?: boolean; currencyCode?: string; maxPrice?: number }) {
  const json = await amadeusFetch("/v1/shopping/flight-destinations", {
    query: {
      origin: params.origin,
      departureDate: params.departureDate,
      oneWay: params.oneWay ?? false,
      currencyCode: params.currencyCode ?? "USD",
      view: "LIGHT",
      "page[limit]": 50,
      maxPrice: params.maxPrice,
    } as Record<string, string | number | boolean | undefined>,
  });
  return json as unknown;
}


