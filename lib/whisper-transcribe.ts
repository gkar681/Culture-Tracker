/** Re-exports on-device Whisper (no OpenAI API key required). */
export { WHISPER_RECORDING_OPTIONS } from '@/lib/whisper-recording-options';
export {
  WHISPER_MODEL_SIZE_LABEL,
  WHISPER_MODEL_FILENAME,
  ensureWhisperModel,
  ensureWhisperContext,
  isOnDeviceWhisperSupported,
  isWhisperConfigured,
  resetWhisperContext,
  transcribeWithWhisper,
} from '@/lib/whisper-on-device';
