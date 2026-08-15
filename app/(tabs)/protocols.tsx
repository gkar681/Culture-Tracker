import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProtocols } from '@/hooks/use-protocols';

export default function ProtocolsScreen() {
  const { data, isLoading, isRefetching, refetch, isError, error } = useProtocols();

  const getStepCount = (steps: any) => {
    if (!steps) return 0;
    if (Array.isArray(steps)) return steps.length;
    if (typeof steps === 'object' && steps.steps && Array.isArray(steps.steps)) {
      return steps.steps.length;
    }
    return 0;
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText type="title">Protocols</ThemedText>
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
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                No saved protocols yet. Tap the voice interface on the home screen to speak and log a new protocol!
              </ThemedText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                {item.name}
              </ThemedText>
              {item.category ? (
                <View style={styles.categoryBadge}>
                  <ThemedText style={styles.categoryText}>{item.category}</ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText style={styles.stepsCount}>
              {getStepCount(item.steps)} Steps defined
            </ThemedText>
            <ThemedText style={styles.dateText}>
              Created on {new Date(item.created_at).toLocaleDateString()}
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
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
  },
  categoryBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepsCount: {
    fontSize: 14,
    color: '#475569',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 22,
  },
});
