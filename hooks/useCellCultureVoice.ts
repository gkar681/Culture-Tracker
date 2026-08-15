import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { VoiceChatStep } from '@/lib/voice-chat-scripts';
import { normalizeDictationText } from '@/lib/dictation-normalize';
import { cancelVoiceRecording, requestMicrophonePermission, startVoiceRecording, stopVoiceRecording } from '@/lib/voice-recording';
import { useTimerStore } from '@/lib/timer-store';
import { parseTimerCommand } from '@/lib/timer-parser';
import {
  ensureWhisperContext,
  isOnDeviceWhisperSupported,
  transcribeWithWhisper,
  WHISPER_MODEL_SIZE_LABEL,
} from '@/lib/whisper-on-device';

export type VoiceChatStatus = 'ready' | 'recording' | 'transcribing' | 'complete';
export type WhisperModelStatus = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

type ChatMessage = { role: 'bot' | 'user'; text: string };

export function useCellCultureVoice(
  onComplete: (data: Record<string, string>) => void,
  steps: readonly VoiceChatStep[],
) {
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<VoiceChatStatus>('ready');
  const [error, setError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<WhisperModelStatus>('idle');
  const [modelProgress, setModelProgress] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const stepsRef = useRef(steps);
  const stepIndexRef = useRef(0);
  const formDataRef = useRef<Record<string, string>>({});
  const onCompleteRef = useRef(onComplete);
  const introSentRef = useRef(false);
  const modelLoadStartedRef = useRef(false);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (steps.length === 0 || introSentRef.current) return;
    introSentRef.current = true;
    setMessages([{ role: 'bot', text: steps[0].question }]);
    setStepIndex(0);
    stepIndexRef.current = 0;
    setFormData({});
    formDataRef.current = {};
    setStatus('ready');
    setError(null);
  }, [steps]);

  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    return () => {
      void cancelVoiceRecording(recordingRef.current);
      recordingRef.current = null;
    };
  }, []);

  const preloadModel = useCallback(async () => {
    if (!isOnDeviceWhisperSupported()) {
      setModelStatus('error');
      setError('On-device Whisper needs a development or TestFlight build (not Expo Go or web).');
      return;
    }
    if (modelStatus === 'ready' || modelStatus === 'downloading' || modelStatus === 'loading') {
      return;
    }

    setModelStatus('downloading');
    setModelProgress(0);
    setError(null);

    try {
      await ensureWhisperContext((p) => {
        setModelProgress(p);
        if (p >= 1) setModelStatus('loading');
      });
      setModelStatus('ready');
      setModelProgress(1);
    } catch (e) {
      setModelStatus('error');
      setError(e instanceof Error ? e.message : 'Failed to load Whisper model.');
    }
  }, [modelStatus]);

  useEffect(() => {
    if (modelLoadStartedRef.current || steps.length === 0) return;
    modelLoadStartedRef.current = true;
    void preloadModel();
  }, [steps.length, preloadModel]);

  const isComplete = stepIndex >= steps.length;
  const currentStep = steps[stepIndex];
  const totalSteps = steps.length;
  const modelReady = modelStatus === 'ready';

  const submitAnswer = useCallback((rawTranscript: string) => {
    const flow = stepsRef.current;
    const index = stepIndexRef.current;
    if (index >= flow.length) return;

    const transcript = normalizeDictationText(rawTranscript.trim());
    if (!transcript) {
      setError('We could not hear anything. Tap record and try again.');
      setStatus('ready');
      return;
    }

    // Intercept and parse voice timer commands
    const parsedTimer = parseTimerCommand(transcript);
    if (parsedTimer) {
      void useTimerStore.getState().startTimer(parsedTimer.label, parsedTimer.durationSeconds);
      const readableDuration = parsedTimer.durationSeconds >= 3600
        ? `${parsedTimer.durationSeconds / 3600} hr`
        : parsedTimer.durationSeconds >= 60
        ? `${parsedTimer.durationSeconds / 60} min`
        : `${parsedTimer.durationSeconds} sec`;

      setMessages((prev) => [
        ...prev,
        { role: 'user', text: rawTranscript },
        {
          role: 'bot',
          text: `⏰ Started timer: "${parsedTimer.label}" for ${readableDuration}. You will get a push notification when time is up!`,
        },
      ]);
      setStatus('ready');
      return;
    }

    const key = flow[index].key;
    const updated = { ...formDataRef.current, [key]: transcript };
    const nextIndex = index + 1;

    formDataRef.current = updated;
    stepIndexRef.current = nextIndex;
    setFormData(updated);
    setStepIndex(nextIndex);
    setMessages((prev) => [...prev, { role: 'user', text: transcript }]);
    setError(null);

    if (nextIndex < flow.length) {
      setMessages((prev) => [...prev, { role: 'bot', text: flow[nextIndex].question }]);
      setStatus('ready');
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: "All set — I've filled in the form from your answers. Review it and save when you're ready.",
        },
      ]);
      setStatus('complete');
      onCompleteRef.current(updated);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isComplete || status === 'transcribing') return;

    if (!modelReady) {
      if (modelStatus === 'error') {
        void preloadModel();
      } else {
        setError(`Whisper model (${WHISPER_MODEL_SIZE_LABEL}) is still loading…`);
      }
      return;
    }

    setError(null);

    const granted = await requestMicrophonePermission();
    if (!granted) {
      setError('Microphone permission is required to record your answer.');
      return;
    }

    try {
      await cancelVoiceRecording(recordingRef.current);
      recordingRef.current = await startVoiceRecording();
      setStatus('recording');
    } catch (e) {
      recordingRef.current = null;
      setStatus('ready');
      setError(e instanceof Error ? e.message : 'Could not start recording.');
    }
  }, [isComplete, status, modelReady, modelStatus, preloadModel]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording || status !== 'recording') return;

    recordingRef.current = null;
    setStatus('transcribing');
    setError(null);

    try {
      const uri = await stopVoiceRecording(recording);
      const transcript = await transcribeWithWhisper(uri);
      submitAnswer(transcript);
    } catch (e) {
      setStatus('ready');
      setError(e instanceof Error ? e.message : 'Transcription failed.');
    }
  }, [status, submitAnswer]);

  const toggleRecording = useCallback(async () => {
    if (status === 'recording') {
      await stopRecordingAndTranscribe();
    } else if (status === 'ready') {
      await startRecording();
    }
  }, [status, startRecording, stopRecordingAndTranscribe]);

  const retryStep = useCallback(async () => {
    await cancelVoiceRecording(recordingRef.current);
    recordingRef.current = null;
    setStatus('ready');
    setError(null);

    const flow = stepsRef.current;
    if (flow.length === 0) return;

    const index = Math.min(stepIndex, flow.length - 1);
    setMessages((prev) => [...prev, { role: 'bot', text: `Let's try that again — ${flow[index].question}` }]);
  }, [stepIndex]);

  return {
    messages,
    stepIndex,
    totalSteps,
    currentStep,
    formData,
    status,
    error,
    isComplete,
    toggleRecording,
    retryStep,
    modelStatus,
    modelProgress,
    modelSizeLabel: WHISPER_MODEL_SIZE_LABEL,
    whisperConfigured: isOnDeviceWhisperSupported(),
    retryModelLoad: preloadModel,
  };
}
