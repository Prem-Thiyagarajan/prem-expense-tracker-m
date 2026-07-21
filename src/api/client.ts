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
