import { FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useCellLines } from '@/hooks/use-cell-lines';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { hasCompletedOnboarding } from '@/lib/onboarding';

export default function CellLinesScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch, isError, error } = useCellLines();
  const didCheckOnboarding = useRef(false);

  useEffect(() => {
    if (didCheckOnboarding.current) return;
    didCheckOnboarding.current = true;
    (async () => {
      const done = await hasCompletedOnboarding();
      if (!done) {
        router.push('/(app)/onboarding');
      }
    })();
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText type="title">Cell Lines</ThemedText>
        <ThemedView style={styles.headerActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(app)/onboarding')}>
            <ThemedText type="defaultSemiBold">Walkthrough</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(app)/cell-line/new')}>
            <ThemedText type="defaultSemiBold">+ Add</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
      {isError ? (
        <ThemedText style={styles.errorText}>{(error as Error).message}</ThemedText>
      ) : null}
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <ThemedText>No cell lines yet. Add your first culture from the + button.</ThemedText>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/(app)/cell-line/[id]', params: { id: item.id } })}>
            <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
            {item.organism ? (
              <ThemedText>
                {item.organism} • {item.tissue_type ?? 'Unknown tissue'}
              </ThemedText>
            ) : null}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  listContent: {
    gap: 12,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  addButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  secondaryButton: {
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

