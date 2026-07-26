import * as DocumentPicker from 'expo-document-picker';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import {
  UPLOAD_ALLOWED_EXTENSIONS,
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_FILES,
  type StatementFile,
} from '@/api/uploads';
import { AppText, BottomSheet, Button } from '@/components/ui';
import { Surface } from '@/components/ui/Surface';
import { useAccounts } from '@/hooks/useAccounts';
import { useUploadStatements } from '@/hooks/useUploadStatements';
import { apiErrorMessage } from '@/lib/apiError';
import { useTheme, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Fired after a successful import so the caller can toast the summary. */
  onUploaded: (message: string) => void;
};

const MB = 1024 * 1024;

/** Human size for the picked-file rows. */
function formatSize(bytes?: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

function hasAllowedExtension(name: string): boolean {
  return UPLOAD_ALLOWED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

/**
 * The mobile counterpart of the web app's Settings → Data Sync card: pick one or
 * more bank statement exports and POST them to /settings/upload-statements.
 *
 * Selections are validated against the backend's own limits before uploading, so
 * an oversized or wrong-typed file is caught here rather than costing a failed
 * round trip. Importing is destructive-ish (it writes transactions), so nothing
 * is sent until the user confirms the reviewed list.
 */
export function UploadStatementsSheet({ visible, onClose, onUploaded }: Props) {
  const t = useTheme();
  const router = useRouter();
  const [files, setFiles] = useState<StatementFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadStatements();

  // The backend rejects the whole request when the user has no accounts, since
  // it can't attribute a parsed row to anything. Checking here turns a confusing
  // post-upload 400 into an up-front explanation with a way to fix it.
  const { data: accounts } = useAccounts();
  const hasNoAccounts = accounts != null && accounts.length === 0;

  // Start each visit clean — a previous session's picks or error shouldn't
  // reappear behind the grabber.
  useEffect(() => {
    if (visible) {
      setFiles([]);
      setError(null);
      upload.reset();
    }
    // `upload` is a stable mutation object; re-running on its identity would
    // clear the sheet mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pick = useCallback(async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      // Statement exports are handed over as any of these; some providers
      // mislabel the MIME type, so the extension check below is the real gate.
      type: [
        'text/csv',
        'text/comma-separated-values',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
      ],
    });
    if (result.canceled) return;

    const picked: StatementFile[] = result.assets.map((a) => ({
      uri: a.uri,
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
    }));

    const badType = picked.find((f) => !hasAllowedExtension(f.name));
    if (badType) {
      setError(`${badType.name} isn’t a supported format. Use CSV, XLSX, XLS or PDF.`);
      return;
    }
    const tooBig = picked.find((f) => f.size != null && f.size > UPLOAD_MAX_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} is over the ${UPLOAD_MAX_BYTES / MB} MB limit.`);
      return;
    }

    // Merge with what's already staged, de-duped by uri, capped at the
    // backend's per-request file limit.
    setFiles((prev) => {
      const merged = [...prev];
      for (const file of picked) {
        if (!merged.some((m) => m.uri === file.uri)) merged.push(file);
      }
      if (merged.length > UPLOAD_MAX_FILES) {
        setError(`You can upload at most ${UPLOAD_MAX_FILES} files at a time.`);
        return merged.slice(0, UPLOAD_MAX_FILES);
      }
      return merged;
    });
  }, []);

  const remove = useCallback((uri: string) => {
    setError(null);
    setFiles((prev) => prev.filter((f) => f.uri !== uri));
  }, []);

  const submit = useCallback(() => {
    if (files.length === 0) return;
    setError(null);
    upload.mutate(files, {
      onSuccess: (result) => {
        onUploaded(result.message);
        onClose();
      },
      onError: (e) =>
        setError(apiErrorMessage(e, 'Upload failed. Check the file and try again.')),
    });
  }, [files, upload, onUploaded, onClose]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: t.spacing.lg, paddingBottom: t.spacing.sm }}>
        <View>
          <AppText variant="title">Import statements</AppText>
          <AppText variant="bodyMedium" tone="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Upload bank exports and we’ll add any transactions you don’t already have.
            Duplicates are skipped automatically.
          </AppText>
        </View>

        {hasNoAccounts ? (
          <Surface
            backgroundColor={t.candy.yellow}
            radius={t.radius.card}
            offset={t.shadowOffset.chip}
            style={{ padding: t.spacing.md }}
          >
            <AppText variant="heading" color={t.candyText} style={{ fontSize: 13 }}>
              Add an account first
            </AppText>
            <AppText variant="bodyMedium" color={t.candyText} style={{ fontSize: 12, marginTop: 4 }}>
              Imported transactions have to belong to an account, so there’s nothing to import
              into yet. Name it exactly as your bank is recognised — “HDFC Bank”, “ICICI Bank”
              or “SBI Bank” — or rows from that bank won’t be matched.
            </AppText>
            <View style={{ marginTop: t.spacing.md }}>
              <Button
                label="Go to Accounts"
                variant="neutral"
                onPress={() => {
                  onClose();
                  router.push('/manage/accounts' as Href);
                }}
              />
            </View>
          </Surface>
        ) : null}

        <Pressable onPress={pick} disabled={upload.isPending || hasNoAccounts}>
          <Surface
            backgroundColor={t.candy.mint}
            radius={t.radius.card}
            offset={t.shadowOffset.chip}
            style={{
              alignItems: 'center',
              paddingVertical: t.spacing.xl,
              opacity: upload.isPending || hasNoAccounts ? 0.5 : 1,
            }}
          >
            <AppText style={{ fontSize: 28 }}>📄</AppText>
            <AppText variant="heading" color={t.candyText} style={{ marginTop: 6, fontSize: 14 }}>
              {files.length > 0 ? 'Add more files' : 'Choose files'}
            </AppText>
            <AppText variant="body" color={t.candyText} style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
              CSV, XLSX, XLS or PDF · up to {UPLOAD_MAX_FILES} files · {UPLOAD_MAX_BYTES / MB} MB each
            </AppText>
          </Surface>
        </Pressable>

        {files.length > 0 && (
          <View style={{ gap: t.spacing.sm }}>
            <AppText variant="label">
              {files.length} {files.length === 1 ? 'file' : 'files'} ready
            </AppText>
            <ScrollView style={{ maxHeight: 190 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: t.spacing.sm }}>
                {files.map((file) => (
                  <FileRow
                    key={file.uri}
                    t={t}
                    file={file}
                    disabled={upload.isPending}
                    onRemove={() => remove(file.uri)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {error ? (
          <Surface
            backgroundColor={t.candy.coral}
            radius={t.radius.chip}
            offset={0}
            style={{ paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm }}
          >
            <AppText variant="bodyMedium" color={t.candyText} style={{ fontSize: 12 }}>
              {error}
            </AppText>
          </Surface>
        ) : null}

        <Button
          label={upload.isPending ? 'Importing…' : `Import ${files.length || ''}`.trim()}
          variant="primary"
          onPress={submit}
          loading={upload.isPending}
          disabled={files.length === 0 || hasNoAccounts}
        />
      </View>
    </BottomSheet>
  );
}

function FileRow({
  t,
  file,
  disabled,
  onRemove,
}: {
  t: Theme;
  file: StatementFile;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <Surface
      backgroundColor={t.colors.card}
      radius={t.radius.chip}
      borderWidth={t.border.row}
      offset={0}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.md,
        paddingVertical: t.spacing.sm,
      }}
    >
      <AppText style={{ fontSize: 15 }}>🧾</AppText>
      <View style={{ flex: 1 }}>
        <AppText variant="bodySemi" numberOfLines={1} style={{ fontSize: 12 }}>
          {file.name}
        </AppText>
        {file.size != null ? (
          <AppText variant="body" tone="muted" style={{ fontSize: 10 }}>
            {formatSize(file.size)}
          </AppText>
        ) : null}
      </View>
      <Pressable onPress={onRemove} disabled={disabled} hitSlop={8}>
        <AppText variant="label" tone="muted" style={{ fontSize: 13, letterSpacing: 0 }}>
          ✕
        </AppText>
      </Pressable>
    </Surface>
  );
}
