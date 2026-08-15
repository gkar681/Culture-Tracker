import { useColorScheme as useNativeColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  // Lock app to light theme to ensure consistent paper-ivory lab notebook UI.
  return 'light';
}
