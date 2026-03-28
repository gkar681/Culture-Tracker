import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Constants from 'expo-constants';

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  append?: boolean;
  language?: string;
};

export function VoiceInputButton({ value, onChangeText, append = true, language = 'en-US' }: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  useEffect(() => {
    // Speech recognition is a native module; it will crash in Expo Go.
    // Only attempt to load it in dev builds / standalone builds.
    const inExpoGo = Constants.appOwnership === 'expo';
    if (inExpoGo) {
      setSpeechRecognition(null);
      speechRecognitionRef.current = null;
      return;
    }

    // Best-effort dynamic load (native module may still be missing if not built in).
    (async () => {
      try {
        const mod = await import('expo-speech-recognition');
        const instance = (mod as any)?.default ?? mod;
        setSpeechRecognition(instance);
        speechRecognitionRef.current = instance;
      } catch {
        // Keep it silent; we’ll show a friendly error on user interaction.
        setSpeechRecognition(null);
        speechRecognitionRef.current = null;
      }
    })();

    return () => {
      try {
        speechRecognitionRef.current?.stop?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const toggle = async () => {
    setError(null);

    try {
      if (listening) {
        await speechRecognition?.stop?.();
        setListening(false);
        return;
      }

      if (!speechRecognition) {
        setError(
          Constants.appOwnership === 'expo'
            ? 'Voice input requires a dev build (not Expo Go).'
            : 'Voice input is not available in this build.',
        );
        return;
      }

   
      const { granted } = await speechRecognition.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission denied.');
        return;
      }

      const available = await speechRecognition.isAvailableAsync?.();
      if (!available) {
        setError('Speech recognition not available on this device.');
        return;
      }

      console.log('Granted:', granted);
      console.log('Available:', available);

      setListening(true);
      await speechRecognition.start({
        lang: language,
        interimResults: false,
        continuous: true,
        onResult: (result: any) => {
          const transcript =
            result?.results?.[0]?.transcript ??
            result?.transcript ??
            result?.text ??
            '';
          if (!transcript) return;
          onChangeText(append ? (value ? `${value} ${transcript}` : transcript) : transcript);
        },
        onError: (e: any) => {
          setError(e?.message ?? 'Speech recognition error.');
          setListening(false);
        },
        onEnd: () => {
          setListening(false);
        },
      });
    } catch (e: any) {
      setError(e?.message ?? 'Speech recognition failed.');
      setListening(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggle} style={[styles.button, listening && styles.buttonActive]}>
        <ThemedText type="defaultSemiBold">{listening ? 'Stop dictation' : '🎙 Dictate'}</ThemedText>
      </TouchableOpacity>
      {error ? (
        <ThemedView style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  button: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonActive: {
    borderWidth: 2,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  errorText: { color: 'red' },
});

