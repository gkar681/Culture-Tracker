import { FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useExperiments } from '@/hooks/use-experiments';

export default function ExperimentsScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch, isError, error } = useExperiments();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText type="title">Experiments</ThemedText>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(app)/experiment/new')}>
          <ThemedText style={styles.addButtonText}>+ New</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {isError ? <ThemedText style={styles.errorText}>{(error as Error).message}</ThemedText> : null}

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={!isLoading ? <ThemedText>No experiments yet. Create one to start logging.</ThemedText> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              router.push({ pathname: '/(app)/experiment/[id]', params: { id: item.id } });
            }}>
            <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
            <ThemedText>
              Status: {item.status} {item.start_date ? `• Start: ${item.start_date}` : ''}
            </ThemedText>
          </TouchableOpacity>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listContent: {
    gap: 16,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#340D0E', // Brand dark red/brown
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 8,
  },
});

