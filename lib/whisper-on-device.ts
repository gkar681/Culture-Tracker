import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { normalizeDictationText } from '@/lib/dictation-normalize';

/** ggml-tiny.en — smallest practical on-device model (~75 MB). */
export const WHISPER_MODEL_FILENAME = 'ggml-tiny.en.bin';
export const WHISPER_MODEL_SIZE_LABEL = '~75 MB';
const WHISPER_MODEL_URL =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin';

/** Short prompt works best with tiny.en; steers toward lab vocabulary. */
const LAB_PROMPT = 'HeLa, HEK293, CHO, DMEM, RPMI, passage, confluence, experiment, cell line.';

type WhisperContext = {
  transcribe: (
    filePath: string,
    options?: { language?: string; prompt?: string; maxThreads?: number },
  ) => {
    promise: Promise<{ result: string; isAborted: boolean }>;
  };
};

async function loadWhisperModule() {
  return import('whisper.rn');
}

let contextPromise: Promise<WhisperContext> | null = null;

export function isOnDeviceWhisperSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** @deprecated Use isOnDeviceWhisperSupported — kept for hook compatibility. */
export function isWhisperConfigured(): boolean {
  return isOnDeviceWhisperSupported();
}

function modelDirectory(): string {
  return `${FileSystem.documentDirectory}whisper-models/`;
}

function modelFilePath(): string {
  return `${modelDirectory()}${WHISPER_MODEL_FILENAME}`;
}

async function ensureModelDirectory(): Promise<void> {
  const dir = modelDirectory();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * Download the GGML model once; stored under the app documents directory.
 */
export async function ensureWhisperModel(
  onProgress?: (progress: number) => void,
): Promise<string> {
  await ensureModelDirectory();
  const path = modelFilePath();
  const info = await FileSystem.getInfoAsync(path);

  if (info.exists && typeof info.size === 'number' && info.size > 50_000_000) {
    onProgress?.(1);
    return path;
  }

  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }

  const download = FileSystem.createDownloadResumable(
    WHISPER_MODEL_URL,
    path,
    {},
    (downloadProgress) => {
      const expected = downloadProgress.totalBytesExpectedToWrite;
      if (expected <= 0) return;
      onProgress?.(downloadProgress.totalBytesWritten / expected);
    },
  );

  const result = await download.downloadAsync();
  if (!result?.uri) {
    throw new Error('Model download failed. Check your internet connection and try again.');
  }

  onProgress?.(1);
  return result.uri;
}

export async function ensureWhisperContext(
  onModelProgress?: (progress: number) => void,
): Promise<WhisperContext> {
  if (!isOnDeviceWhisperSupported()) {
    throw new Error('On-device Whisper is only available on iOS and Android builds (not Expo Go or web).');
  }

  if (!contextPromise) {
    contextPromise = (async () => {
      const { initWhisper } = await loadWhisperModule();
      const filePath = await ensureWhisperModel(onModelProgress);
      return initWhisper({
        filePath,
        useCoreMLIos: true,
      });
    })().catch((err) => {
      contextPromise = null;
      throw err;
    });
  }

  return contextPromise;
}

export async function transcribeWithWhisper(audioUri: string): Promise<string> {
  const ctx = await ensureWhisperContext();
  const { promise } = ctx.transcribe(audioUri, {
    language: 'en',
    prompt: LAB_PROMPT,
    maxThreads: 4,
    // tiny.en: low temperature + modest beam search improves accuracy without a larger model
    temperature: 0,
    beamSize: 3,
  } as any);

  const { result, isAborted } = await promise;
  if (isAborted) {
    throw new Error('Transcription was cancelled.');
  }

  const cleaned = normalizeDictationText(result?.trim() ?? '');
  if (!cleaned) {
    throw new Error('Whisper returned an empty transcript. Try speaking a bit longer and record again.');
  }
  return cleaned;
}

export function resetWhisperContext(): void {
  contextPromise = null;
}
