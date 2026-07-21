/**
 * Environment configuration.
 *
 * The API base URL is intentionally env-driven so we can point the app at a
 * local FastAPI backend or the production Render backend without code changes.
 * Set EXPO_PUBLIC_API_BASE_URL in a `.env` file (see `.env.example`).
 *
 * Note: on a physical device via Expo Go, `localhost` refers to the phone, not
 * your computer — use your machine's LAN IP (e.g. http://192.168.1.5:8000/api/v1).
 */
const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL,
};
