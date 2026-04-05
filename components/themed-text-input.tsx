import { TextInput, type TextInputProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ThemedTextInput({ style, placeholderTextColor, ...rest }: TextInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const color = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  const defaultPlaceholder = useThemeColor({}, 'icon');
  const fieldBg = scheme === 'dark' ? '#2C2C2C' : '#F2F2F2';

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? defaultPlaceholder}
      style={[{ color, backgroundColor: fieldBg, borderColor, borderWidth: 1 }, style]}
      {...rest}
    />
  );
}
