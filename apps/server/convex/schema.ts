import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const schema = defineSchema({
  priceSnapshots: defineTable({
    routeKey: v.string(),
    price: v.number(),
    collectedAt: v.number(),
  }).index('by_route_collected', ['routeKey', 'collectedAt']),
});

export default schema;


