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
          <ThemedText type="defaultSemiBold">+ New</ThemedText>
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
    marginBottom: 8,
  },
  listContent: {
    gap: 12,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  addButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
  },
});

