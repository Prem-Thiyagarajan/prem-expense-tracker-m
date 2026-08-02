/**
 * Environment configuration.
 *
 * The API base URL stays env-driven so we can point the app at a local FastAPI
 * backend or the production Render backend without code changes. Set
 * EXPO_PUBLIC_API_BASE_URL in a `.env` file (see `.env.example`).
 *
 * Note: on a physical device via Expo Go, `localhost` refers to the phone, not
 * your computer — use your machine's LAN IP (e.g. http://192.168.1.5:8000/api/v1).
 *
 * ── Why the guard below ──────────────────────────────────────────────────────
 * `EXPO_PUBLIC_*` values are inlined at BUNDLE time, and `eas update` bundles on
 * a developer's machine — so the local `.env` travels into an OTA update, while
 * the `env` block in eas.json only ever applies to `eas build`. That once
 * shipped `http://192.168.1.5:8000` to a real device: every request failed with
 * ERR_NETWORK, and because the app treats a failed profile fetch as a dead
 * session, it silently signed the user out.
 *
 * So a private/loopback address is honoured in development and ignored in a
 * release bundle, which falls back to production. Pointing a release at a
 * different *public* API still works exactly as before.
 */
const PRODUCTION_API_BASE_URL = 'https://prem-expense-tracker.onrender.com/api/v1';

/** localhost, 127.x, and the RFC-1918 private ranges — never reachable from a user's phone. */
const LOCAL_ADDRESS =
  /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:|\/|$)/i;

function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!configured) return PRODUCTION_API_BASE_URL;
  if (!__DEV__ && LOCAL_ADDRESS.test(configured)) return PRODUCTION_API_BASE_URL;
  return configured;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
};
