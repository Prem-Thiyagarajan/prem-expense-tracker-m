import { api } from './client';

/**
 * Limits enforced by the backend (app/api/upload_router.py). Mirrored here so
 * the picker can reject a bad selection before spending a round trip on it —
 * keep them in step if the route ever changes.
 */
export const UPLOAD_MAX_FILES = 10;
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.pdf'] as const;

/** A file chosen from the device, in the shape RN's FormData needs. */
export type StatementFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

/**
 * Response of POST /settings/upload-statements. The route returns only a prose
 * summary — DOCUMENTATION.md's `{ imported, duplicates, errors }` is wrong, and
 * the route has no `response_model` so it's absent from the OpenAPI schema too.
 * Confirmed against upload_router.py.
 */
export type UploadResult = { message: string };

/**
 * POST /settings/upload-statements — multipart upload of bank statement files.
 *
 * React Native's FormData takes `{ uri, name, type }` objects rather than Blobs;
 * the content-type header must be left unset so axios emits the multipart
 * boundary itself (setting it by hand produces a boundary-less header and the
 * server rejects the body).
 */
export async function uploadStatements(files: StatementFile[]): Promise<UploadResult> {
  const form = new FormData();
  for (const file of files) {
    form.append('files', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
  }

  const { data } = await api.post<UploadResult>('/settings/upload-statements', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Parsing a full statement server-side takes far longer than a normal read.
    timeout: 120_000,
  });
  return data;
}
