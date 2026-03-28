import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ReagentsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Reagents</ThemedText>
      <ThemedText>
        This will list reagents, highlighting anything expired or low stock, with options to add and edit items.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
});

