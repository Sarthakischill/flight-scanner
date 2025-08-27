import { z } from 'zod';

export const SearchInputSchema = z
  .object({
    roundTrip: z.boolean(),
    from: z.string().length(3),
    to: z.string().length(3),
    departDate: z.string(),
    returnDate: z.string().optional(),
    travelers: z.number().int().min(1).max(9).default(1),
    cabin: z
      .enum(['economy', 'premium_economy', 'business', 'first'])
      .default('economy'),
    maxStops: z.enum(['direct', 'one', 'any']).default('any'),
    durationDays: z
      .tuple([z.number().int().min(1), z.number().int().max(30)])
      .optional(),
    page: z.number().int().min(1).default(1),
    perPage: z.number().int().min(10).max(50).default(20),
    sortBy: z.enum(['score', 'price', 'duration']).default('score'),
  })
  .refine(
    (data) => {
      // If roundTrip is true, a returnDate must be provided
      if (data.roundTrip) return typeof data.returnDate === 'string';
      return true;
    },
    {
      message: 'returnDate is required when roundTrip is true',
      path: ['returnDate'],
    }
  );

export type SearchInput = z.infer<typeof SearchInputSchema>;

export const SegmentSchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  departureAt: z.string(),
  arrivalAt: z.string(),
  carrier: z.string(),
  flightNumber: z.string().optional(),
  durationMinutes: z.number().int(),
});
export type Segment = z.infer<typeof SegmentSchema>;

export const OfferSchema = z.object({
  id: z.string(),
  price: z.number(),
  currency: z.string(),
  segments: z.array(SegmentSchema),
  totalDurationMinutes: z.number().int(),
  stops: z.number().int(),
  cabin: z.string(),
  airlines: z.array(z.string()),
  deepLink: z.string().nullable().optional(),
  score: z.number().min(0).max(100).optional(),
  scoreBreakdown: z.record(z.string(), z.number()).optional(),
  badges: z.array(z.string()).optional(),
});
export type Offer = z.infer<typeof OfferSchema>;

export const PriceSnapshotSchema = z.object({
  routeKey: z.string(),
  price: z.number(),
  collectedAt: z.string(),
});
export type PriceSnapshot = z.infer<typeof PriceSnapshotSchema>;
