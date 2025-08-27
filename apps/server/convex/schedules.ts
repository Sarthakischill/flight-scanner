import { internalMutation, scheduler } from './_generated/server';

// Example schedule: run hourly to warm baselines
export const schedule = scheduler.cron(
  'prewarm-hourly',
  { hourInterval: 1 },
  internalMutation(async (ctx) => {
    const site = process.env.SERVER_PUBLIC_URL;
    if (!site) return;
    // Fire and forget
    await fetch(`${site}/api/prewarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'LAX', pairs: [{ to: 'NRT' }, { to: 'JFK' }] }),
    });
  }),
);


