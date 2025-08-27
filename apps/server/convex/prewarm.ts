import { v } from 'convex/values';
import { action } from './_generated/server';

// Calls the server's /api/prewarm endpoint periodically
export default action({
  args: {
    url: v.string(), // Base URL of the server, e.g., https://yourdomain.com
  },
  handler: async (_ctx, { url }) => {
    const body = {
      from: 'LAX',
      pairs: [{ to: 'NRT' }, { to: 'JFK' }, { to: 'LHR' }],
    };
    await fetch(`${url}/api/prewarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: true };
  },
});


