import { Audio } from 'expo-av';

import { WHISPER_RECORDING_OPTIONS } from '@/lib/whisper-recording-options';

export async function requestMicrophonePermission(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

export async function startVoiceRecording(): Promise<Audio.Recording> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(WHISPER_RECORDING_OPTIONS);
  return recording;
}

export async function stopVoiceRecording(recording: Audio.Recording): Promise<string> {
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = recording.getURI();
  if (!uri) {
    throw new Error('Recording failed — no audio file was saved.');
  }
  return uri;
}

export async function cancelVoiceRecording(recording: Audio.Recording | null): Promise<void> {
  if (!recording) return;
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    // already stopped
  }
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
}
