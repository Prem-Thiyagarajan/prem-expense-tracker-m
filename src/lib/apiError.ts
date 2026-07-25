/**
 * Surfaces the backend's `detail` string (already user-friendly) or a fallback.
 * FastAPI validation errors come back as an array of `{ msg }` objects.
 */
export function apiErrorMessage(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}
