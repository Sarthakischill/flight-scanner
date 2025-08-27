import type { NextRequest } from 'next/server';

export function createContext(_req: NextRequest) {
  // No auth configured
  return {
    session: null,
  };
}

export type Context = ReturnType<typeof createContext>;
