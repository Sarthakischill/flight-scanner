import { v } from 'convex/values';
import { query } from './_generated/server';

export default query({
  args: {
    routeKey: v.string(),
    since: v.number(),
  },
  handler: async (ctx, { routeKey, since }) => {
    const rows = await ctx.db
      .query('priceSnapshots')
      .withIndex('by_route_collected', (q) => q.eq('routeKey', routeKey))
      .filter((q) => q.gte(q.field('collectedAt'), since))
      .collect();
    return rows.sort((a, b) => a.collectedAt - b.collectedAt);
  },
});


