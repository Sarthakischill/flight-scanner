import { v } from 'convex/values';
import { mutation } from './_generated/server';

export default mutation({
  args: {
    routeKey: v.string(),
    items: v.array(
      v.object({ price: v.number(), collectedAt: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    const docs = args.items.map((it) => ({
      routeKey: args.routeKey,
      price: it.price,
      collectedAt: it.collectedAt,
    }));
    for (const doc of docs) await ctx.db.insert('priceSnapshots', doc);
    return { inserted: docs.length };
  },
});


