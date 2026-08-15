import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { normalizeDictationText, SPEECH_CONTEXTUAL_STRINGS } from '@/lib/dictation-normalize';

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  append?: boolean;
  language?: string;
};

export function VoiceInputButton({ value, onChangeText, append = true, language = 'en-US' }: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOpenSettings, setShowOpenSettings] = useState(false);
  
  const listeningRef = useRef(false);
  const ignoreResultsRef = useRef(false);
  
  /** For append mode: text committed from `isFinal` segments only */
  const committedRef = useRef('');
  const valueRef = useRef(value);
  const appendRef = useRef(append);
  const onChangeTextRef = useRef(onChangeText);

  valueRef.current = value;
  appendRef.current = append;
  onChangeTextRef.current = onChangeText;

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useSpeechRecognitionEvent('result', (ev) => {
    if (ignoreResultsRef.current) return;
    const raw = ev.results[0]?.transcript?.trim();
    if (!raw) return;

    const transcript = normalizeDictationText(raw);
    if (!transcript) return;

    if (!appendRef.current) {
      onChangeTextRef.current(transcript);
      return;
    }

    if (ev.isFinal) {
      committedRef.current = committedRef.current ? `${committedRef.current} ${transcript}` : transcript;
      onChangeTextRef.current(committedRef.current);
    } else {
      const combined = committedRef.current ? `${committedRef.current} ${transcript}` : transcript;
      onChangeTextRef.current(combined);
    }
  });

  useSpeechRecognitionEvent('error', (ev) => {
    if (ev.error === 'aborted') return;
    setError(ev.message || 'Speech recognition error.');
    setListening(false);
    listeningRef.current = false;
    ignoreResultsRef.current = true;
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    listeningRef.current = false;
  });

  const killRecognition = () => {
    ignoreResultsRef.current = true;
    listeningRef.current = false;
    setListening(false);
    ExpoSpeechRecognitionModule.abort();
  };

  const toggle = async () => {
    setError(null);
    setShowOpenSettings(false);

    try {
      if (listeningRef.current) {
        killRecognition();
        return;
      }

      // Using the official V3 API for permissions
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      
      if (!perm.granted) {
        setShowOpenSettings(true);
        setError('Allow microphone and speech recognition for CultureTracker in Settings.');
        return;
      }

      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        setError('Speech recognition is not available on this device.');
        return;
      }

      ignoreResultsRef.current = false;
      committedRef.current = appendRef.current ? valueRef.current.trimEnd() : '';
      listeningRef.current = true;
      setListening(true);

      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        iosTaskHint: 'dictation',
        contextualStrings: [...SPEECH_CONTEXTUAL_STRINGS],
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Speech recognition failed.';
      setError(message);
      killRecognition();
    }
  };

  return (
    <View style={styles.container} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop dictation' : 'Start dictation'}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        onPress={toggle}
        onPressIn={() => {
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        style={({ pressed }) => [
          styles.button,
          listening && styles.buttonActive,
          pressed && styles.buttonPressed,
        ]}
      >
        <ThemedText type="defaultSemiBold" pointerEvents="none" style={listening ? {color: '#FFFFFF'} : {}}>
          {listening ? 'Stop dictation' : '🎙 Dictate'}
        </ThemedText>
      </Pressable>
      {error ? (
        <ThemedView style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          {showOpenSettings ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
              onPress={() => Linking.openSettings()}
              style={styles.settingsLink}
            >
              <ThemedText type="link">Open Settings</ThemedText>
            </TouchableOpacity>
          ) : null}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  button: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  buttonActive: {
    borderWidth: 2,
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    borderColor: '#EF4444',
  },
  errorText: { color: '#EF4444' },
  settingsLink: { marginTop: 8, alignSelf: 'flex-start' },
});
