'use client';

import { Provider as JotaiProvider } from 'jotai';

/**
 * Top-level client-side providers wrapper. Imported by the root
 * server-component layout to give every client component access to
 * the jotai store. Lives outside `app/` so the routing tree only
 * contains route-convention files (page / layout / route / etc.).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <JotaiProvider>{children}</JotaiProvider>;
}
