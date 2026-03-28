import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProtocolsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Protocols</ThemedText>
      <ThemedText>
        This will show your saved protocols grouped by category, with actions to add and run a protocol.
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

