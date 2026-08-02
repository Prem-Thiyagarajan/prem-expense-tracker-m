import axios from 'axios';

import { env } from '@/lib/env';
import { clearToken, getToken } from './tokenStore';

/**
 * The single axios instance for the app — mirrors the web app's apiClient
 * pattern (only this layer talks HTTP). Base URL is env-configurable.
 */
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Attach the bearer token (from secure storage) to every request.
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, wipe the token and notify listeners (the auth layer redirects to login).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

// TEMP: dev-only round-trip timing, added to debug slow month-navigation
// clicks. Logs total client-perceived time per request, split against the
// backend's X-Response-Time-Ms header (added alongside this) so the gap
// between the two numbers shows network/device overhead vs server compute.
// Safe to remove once the bottleneck is confirmed.
if (__DEV__) {
  api.interceptors.request.use((config) => {
    (config as { __startedAt?: number }).__startedAt = Date.now();
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      const startedAt = (response.config as { __startedAt?: number }).__startedAt;
      const totalMs = startedAt ? Date.now() - startedAt : null;
      const serverMs = Number(response.headers['x-response-time-ms']);
      const label = `${response.config.method?.toUpperCase()} ${response.config.url}`;
      if (totalMs != null && Number.isFinite(serverMs)) {
        console.log(
          `[api] ${label} — total ${totalMs}ms (server ${serverMs.toFixed(1)}ms, network/device ~${(totalMs - serverMs).toFixed(0)}ms)`,
        );
      } else if (totalMs != null) {
        console.log(`[api] ${label} — total ${totalMs}ms (no server timing header)`);
      }
      return response;
    },
    (error) => Promise.reject(error),
  );
}
