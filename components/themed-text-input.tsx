import { TextInput, type TextInputProps, View, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { normalizeDictationText, SPEECH_CONTEXTUAL_STRINGS } from '@/lib/dictation-normalize';

export type ThemedTextInputProps = TextInputProps & {
  enableVoice?: boolean;
};

export function ThemedTextInput({ style, placeholderTextColor, enableVoice = false, value = '', onChangeText, ...rest }: ThemedTextInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const color = useThemeColor({}, 'text');
  const borderColor = scheme === 'dark' ? '#3E3E3E' : '#E6DCCF';
  const defaultPlaceholder = useThemeColor({}, 'icon');
  const fieldBg = scheme === 'dark' ? '#2C2C2C' : '#FFFFFF';

  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);
  const ignoreResultsRef = useRef(false);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useSpeechRecognitionEvent('result', (ev) => {
    if (ignoreResultsRef.current) return;
    const raw = ev.results[0]?.transcript?.trim();
    if (!raw) return;

    const transcript = normalizeDictationText(raw);
    if (!transcript) return;

    if (onChangeText) {
      onChangeText(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (ev) => {
    if (ev.error === 'aborted') return;
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

  const toggleVoice = async () => {
    try {
      if (listeningRef.current) {
        killRecognition();
        return;
      }

      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) return;

      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) return;

      ignoreResultsRef.current = false;
      listeningRef.current = true;
      setListening(true);

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false, // Auto-stop for simple inputs on silence
        addsPunctuation: true,
        iosTaskHint: 'dictation',
        contextualStrings: [...SPEECH_CONTEXTUAL_STRINGS],
      });
    } catch (e) {
      killRecognition();
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholderTextColor={placeholderTextColor ?? defaultPlaceholder}
        style={[
          { color, backgroundColor: fieldBg, borderColor, borderWidth: 1, borderRadius: 12, paddingLeft: 16, paddingRight: enableVoice ? 44 : 16, paddingVertical: 12, fontSize: 16 },
          style
        ]}
        value={value}
        onChangeText={onChangeText}
        {...rest}
      />
      {enableVoice ? (
        <Pressable
          onPress={toggleVoice}
          onPressIn={() => {
            if (Platform.OS !== 'web') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          style={styles.micButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {listening ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <MaterialIcons name="mic" size={20} color={listening ? '#EF4444' : '#8C7B70'} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  micButton: {
    position: 'absolute',
    right: 14,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
