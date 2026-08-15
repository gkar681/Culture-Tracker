import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase URL or anon key is missing. Did you set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY?',
  );
}

// Polyfill WebSocket for SSR (Node.js) build steps where WebSocket doesn't exist natively.
if (typeof global.WebSocket === 'undefined') {
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    onclose = null;
    onerror = null;
    onmessage = null;
    onopen = null;
    readyState = 3;
    close() {}
    send() {}
  }
  (global as any).WebSocket = MockWebSocket;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

