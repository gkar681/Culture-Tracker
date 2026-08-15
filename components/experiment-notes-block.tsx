import { StyleSheet, type TextStyle, TouchableOpacity, View, type StyleProp } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
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
  placeholder = 'Notes — dictate or type',
  numberOfLines = 3,
  onParse,
  parseLabel = 'Parse notes → fields',
  normalizeOnBlur = true,
}: Props) {
  const onBlurNotes = () => {
    if (!normalizeOnBlur || !value.trim()) return;
    const next = normalizeDictationText(value);
    if (next !== value) onChangeText(next);
  };

  return (
    <View style={styles.wrap}>
      <ThemedTextInput
        style={inputStyle}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlurNotes}
        placeholder={placeholder}
        multiline
        numberOfLines={numberOfLines}
        enableVoice={true}
      />
      {onParse ? (
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.parseBtn} onPress={onParse} accessibilityRole="button">
            <ThemedText type="defaultSemiBold" style={styles.parseBtnText}>{parseLabel}</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  parseBtn: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#340D0E',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  parseBtnText: {
    color: '#340D0E',
    fontSize: 13,
  },
});
