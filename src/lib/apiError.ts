/**
 * Surfaces the backend's `detail` string (already user-friendly) or a fallback.
 * FastAPI validation errors come back as an array of `{ msg }` objects.
 *
 * When there's no `detail` to quote, the request didn't fail the way the API
 * intends — it never completed. Those cases are separated out because the user's
 * next move differs entirely: a timeout may still be running server-side and
 * shouldn't be blindly retried, an unreachable host is a connectivity problem,
 * and a status with no body is a server fault worth reporting.
 */
export function apiErrorMessage(e: unknown, fallback: string): string {
  const err = e as {
    code?: string;
    response?: { status?: number; data?: { detail?: unknown } };
  };

  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);

  // Axios aborts on its own timeout with ECONNABORTED. The server may well have
  // finished the work, so say so rather than implying nothing happened.
  if (err?.code === 'ECONNABORTED') {
    return 'The request timed out. It may still have gone through — check before retrying.';
  }
  if (err?.code === 'ERR_NETWORK') {
    return 'Couldn’t reach the server. Check your connection and that the API is running.';
  }
  if (err?.response?.status) {
    return `${fallback} (server error ${err.response.status})`;
  }
  return fallback;
}
