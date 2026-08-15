import type { ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { expo } = require('./app.json') as { expo: ExpoConfig };

/**
 * EAS cloud builds do not see gitignored `.env`. If Supabase env is missing,
 * `lib/supabase.ts` throws at import time and the production app crashes on launch.
 */
if (process.env.EAS_BUILD === 'true') {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      '[CultureTracker] This EAS build is missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Add both under your Expo project → Environment variables (use the same profiles as your iOS production/preview builds), then run a new build.',
    );
  }
}

export default (): ExpoConfig => expo;
