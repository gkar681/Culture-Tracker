import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { requireOptionalNativeModule } from 'expo';

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  append?: boolean;
  language?: string;
};

type ResultEvent = {
  isFinal: boolean;
  results: { transcript: string }[];
};

type ErrorEvent = { message?: string; error?: string };

type SpeechModule = {
  addListener: (event: string, listener: (...args: unknown[]) => void) => { remove: () => void };
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean; restricted?: boolean }>;
  requestMicrophonePermissionsAsync: () => Promise<{ granted: boolean }>;
  requestSpeechRecognizerPermissionsAsync: () => Promise<{ granted: boolean; restricted?: boolean }>;
  isRecognitionAvailable: () => boolean;
};

const speechNative = requireOptionalNativeModule<SpeechModule>('ExpoSpeechRecognition');

/**
 * iOS: combined `requestPermissionsAsync` can skip the mic prompt if speech isn’t authorized first.
 * Request microphone, then speech recognition.
 */
async function requestSpeechAndMicPermissions(mod: SpeechModule): Promise<{
  granted: boolean;
  restricted?: boolean;
  micDenied?: boolean;
  speechDenied?: boolean;
}> {
  if (Platform.OS === 'ios') {
    const mic = await mod.requestMicrophonePermissionsAsync();
    if (!mic.granted) {
      return { granted: false, micDenied: true };
    }
    const speech = await mod.requestSpeechRecognizerPermissionsAsync();
    const restricted = 'restricted' in speech && Boolean(speech.restricted);
    if (!speech.granted) {
      return { granted: false, restricted, speechDenied: !restricted };
    }
    return { granted: true };
  }

  const combined = await mod.requestPermissionsAsync();
  const restricted = 'restricted' in combined && Boolean(combined.restricted);
  return {
    granted: combined.granted,
    restricted,
  };
}

export function VoiceInputButton({ value, onChangeText, append = true, language = 'en-US' }: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOpenSettings, setShowOpenSettings] = useState(false);
  const listeningRef = useRef(false);
  const accumulatedRef = useRef('');
  const valueRef = useRef(value);
  const appendRef = useRef(append);
  const onChangeTextRef = useRef(onChangeText);

  valueRef.current = value;
  appendRef.current = append;
  onChangeTextRef.current = onChangeText;

  useEffect(() => {
    if (!speechNative) return;

    const onResult = (ev: ResultEvent) => {
      const transcript = ev.results[0]?.transcript?.trim();
      if (!transcript) return;

      if (appendRef.current) {
        if (!ev.isFinal) return;
        accumulatedRef.current = accumulatedRef.current
          ? `${accumulatedRef.current} ${transcript}`
          : transcript;
        onChangeTextRef.current(accumulatedRef.current);
      } else {
        onChangeTextRef.current(transcript);
      }
    };

    const onError = (ev: ErrorEvent) => {
      setError(ev.message || ev.error || 'Speech recognition error.');
      setListening(false);
      listeningRef.current = false;
    };

    const onEnd = () => {
      setListening(false);
      listeningRef.current = false;
    };

    const subR = speechNative.addListener('result', onResult as (...args: unknown[]) => void);
    const subE = speechNative.addListener('error', onError as (...args: unknown[]) => void);
    const subEnd = speechNative.addListener('end', onEnd);

    return () => {
      subR.remove();
      subE.remove();
      subEnd.remove();
      speechNative.stop?.();
    };
  }, []);

  const toggle = async () => {
    setError(null);
    setShowOpenSettings(false);

    if (!speechNative) {
      const inExpoGo = Constants.appOwnership === 'expo' && Platform.OS !== 'web';
      setError(
        inExpoGo
          ? 'Voice input needs a development build (Expo Go does not include native speech). Run: npx expo run:ios'
          : 'Native speech recognition is missing from this build. Run npx expo prebuild && npx expo run:ios (or EAS Build) after adding expo-speech-recognition.',
      );
      return;
    }

    try {
      if (listeningRef.current) {
        speechNative.stop();
        setListening(false);
        listeningRef.current = false;
        return;
      }

      const perm = await requestSpeechAndMicPermissions(speechNative);
      if (!perm.granted) {
        if (perm.restricted) {
          setError(
            'Speech recognition is restricted on this device. Check Settings → Screen Time → Content & Privacy Restrictions.',
          );
        } else if (perm.micDenied) {
          setShowOpenSettings(true);
          setError(
            'Microphone access is off. Tap Open Settings → CultureTracker → enable Microphone, then try again.',
          );
        } else if (perm.speechDenied) {
          setShowOpenSettings(true);
          setError(
            'Speech recognition is off. Tap Open Settings → CultureTracker → enable Speech Recognition, then try again.',
          );
        } else {
          setShowOpenSettings(true);
          setError(
            Platform.OS === 'android'
              ? 'Microphone permission is off. Tap Open Settings → CultureTracker → Permissions → allow Microphone.'
              : 'Allow microphone and speech recognition for CultureTracker in Settings.',
          );
        }
        return;
      }

      if (!speechNative.isRecognitionAvailable()) {
        setError('Speech recognition is not available on this device.');
        return;
      }

      accumulatedRef.current = appendRef.current ? valueRef.current : '';
      listeningRef.current = true;
      setListening(true);

      speechNative.start({
        lang: language,
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        iosTaskHint: 'dictation',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Speech recognition failed.';
      setError(message);
      setListening(false);
      listeningRef.current = false;
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
        <ThemedText type="defaultSemiBold" pointerEvents="none">
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
  },
  buttonActive: {
    borderWidth: 2,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  errorText: { color: 'red' },
  settingsLink: { marginTop: 8, alignSelf: 'flex-start' },
});
