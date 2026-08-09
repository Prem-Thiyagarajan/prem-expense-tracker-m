import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AssistantRequestError, transcribeAudio } from '@/api/assistant';

/** Hard ceiling on a single clip. Mirrored by the backend's byte cap. */
export const MAX_RECORDING_SECONDS = 60;

/**
 * 16 kHz mono is what Groq recommends for Whisper, and it keeps a 60-second
 * clip around 240 KB — far below the upload limit, and quick on mobile data.
 * Derived from the preset so every platform-specific field stays valid.
 */
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
};

export type VoiceState = 'idle' | 'recording' | 'transcribing';

type Options = {
  /** Called with the transcript. Never sends it — the user reviews it first. */
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
};

/**
 * Push-to-talk voice input.
 *
 * The transcript is handed to the caller for the composer, never sent
 * automatically: Whisper mishears amounts, and "eight thousand" landing as
 * "eighty thousand" in a finance app is worth one extra tap to avoid.
 */
export function useVoiceInput({ onTranscript, onError }: Options) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const [state, setState] = useState<VoiceState>('idle');
  const [seconds, setSeconds] = useState(0);

  // Set when the user cancels, so the clip is dropped instead of transcribed.
  const cancelledRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<VoiceState>('idle');
  stateRef.current = state;

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  // Leaving mid-recording must not leave the mic hot.
  useEffect(
    () => () => {
      clearTick();
      if (stateRef.current === 'recording') recorder.stop().catch(() => {});
    },
    [recorder],
  );

  const finish = useCallback(
    async (cancelled: boolean) => {
      clearTick();
      setState(cancelled ? 'idle' : 'transcribing');

      let uri: string | null = null;
      try {
        await recorder.stop();
        uri = recorder.uri;
      } catch {
        setState('idle');
        setSeconds(0);
        if (!cancelled) onError('Could not finish the recording.');
        return;
      }

      if (cancelled || !uri) {
        setState('idle');
        setSeconds(0);
        if (!cancelled) onError('Nothing was recorded.');
        return;
      }

      // Anything this short is a mis-tap. Whisper also hallucinates words from
      // the vocabulary hint when given near-silence, so a stray "Food" would
      // otherwise appear in the composer out of nowhere.
      if (seconds < 1) {
        setState('idle');
        setSeconds(0);
        onError('Hold the mic a little longer.');
        return;
      }

      try {
        const text = await transcribeAudio(uri);
        if (!text) onError('Did not catch that — try again.');
        else onTranscript(text);
      } catch (e) {
        onError(
          e instanceof AssistantRequestError
            ? e.message
            : 'Could not transcribe that. Check your connection.',
        );
      } finally {
        setState('idle');
        setSeconds(0);
      }
    },
    [recorder, seconds, onTranscript, onError],
  );

  const start = useCallback(async () => {
    if (stateRef.current !== 'idle') return;

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      onError(
        permission.canAskAgain
          ? 'Microphone access is needed to ask by voice.'
          : 'Enable microphone access for ExpenseTracker in Settings.',
      );
      return;
    }

    try {
      // iOS refuses to record until the session allows it; harmless on Android.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
      cancelledRef.current = false;
      setSeconds(0);
      setState('recording');
      // `forDuration` is the native backstop; the interval below drives the
      // visible timer and stops us relying on the native stop firing.
      recorder.record({ forDuration: MAX_RECORDING_SECONDS });

      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            // Defer so this state update isn't nested inside the setState.
            setTimeout(() => void finish(false), 0);
          }
          return next;
        });
      }, 1000);
    } catch {
      setState('idle');
      onError('Could not start recording.');
    }
  }, [recorder, onError, finish]);

  const stop = useCallback(() => {
    if (stateRef.current !== 'recording') return;
    void finish(cancelledRef.current);
  }, [finish]);

  const cancel = useCallback(() => {
    if (stateRef.current !== 'recording') return;
    cancelledRef.current = true;
    void finish(true);
  }, [finish]);

  return { state, seconds, start, stop, cancel };
}
