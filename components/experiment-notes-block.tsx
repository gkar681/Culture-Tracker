import { StyleSheet, TextInput, type TextStyle, TouchableOpacity, View, type StyleProp } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { VoiceInputButton } from '@/components/voice-input';
import { normalizeDictationText } from '@/lib/dictation-normalize';

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  inputStyle: StyleProp<TextStyle>;
  placeholder?: string;
  numberOfLines?: number;
  /** When set, shows "Parse notes → fields" next to dictation. */
  onParse?: () => void;
  parseLabel?: string;
  voiceAppend?: boolean;
  /** When true, fixes common ASR splits (e.g. He la → HeLa) when the field loses focus. Default true. */
  normalizeOnBlur?: boolean;
};

/**
 * Standard pattern for experiment free-form notes: multiline field + dictation + optional parser.
 */
export function ExperimentNotesBlock({
  value,
  onChangeText,
  inputStyle,
  placeholder = 'Notes — dictate or type; use Parse to fill fields above',
  numberOfLines = 3,
  onParse,
  parseLabel = 'Parse notes → fields',
  voiceAppend = true,
  normalizeOnBlur = true,
}: Props) {
  const onBlurNotes = () => {
    if (!normalizeOnBlur || !value.trim()) return;
    const next = normalizeDictationText(value);
    if (next !== value) onChangeText(next);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        style={inputStyle}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlurNotes}
        placeholder={placeholder}
        multiline
        numberOfLines={numberOfLines}
      />
      <View style={styles.toolbar}>
        <VoiceInputButton value={value} onChangeText={onChangeText} append={voiceAppend} />
        {onParse ? (
          <TouchableOpacity style={styles.parseBtn} onPress={onParse} accessibilityRole="button">
            <ThemedText type="defaultSemiBold">{parseLabel}</ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 10,
  },
  parseBtn: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
