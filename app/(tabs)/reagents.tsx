import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useReagents, isLowStock, isExpired } from '@/hooks/use-reagents';

export default function ReagentsScreen() {
  const { data, isLoading, isRefetching, refetch, isError, error } = useReagents();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText type="title">Reagents Inventory</ThemedText>
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
                No reagents logged yet. Add reagents via the database or log them in your experiments.
              </ThemedText>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const expired = isExpired(item);
          const lowStock = isLowStock(item);

          return (
            <TouchableOpacity style={[styles.card, expired && styles.cardExpired]} activeOpacity={0.8}>
              <View style={styles.cardHeader}>
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                  {item.name}
                </ThemedText>
                <View style={styles.badgeRow}>
                  {expired ? (
                    <View style={[styles.statusBadge, styles.badgeExpired]}>
                      <ThemedText style={styles.badgeText}>EXPIRED</ThemedText>
                    </View>
                  ) : lowStock ? (
                    <View style={[styles.statusBadge, styles.badgeLow]}>
                      <ThemedText style={styles.badgeText}>LOW STOCK</ThemedText>
                    </View>
                  ) : null}
                  {item.category ? (
                    <View style={styles.categoryBadge}>
                      <ThemedText style={styles.categoryText}>{item.category}</ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoCol}>
                  <ThemedText style={styles.infoLabel}>Quantity</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {item.quantity_remaining ?? '0'} {item.quantity_unit ?? ''}
                  </ThemedText>
                </View>

                {item.lot_number ? (
                  <View style={styles.infoCol}>
                    <ThemedText style={styles.infoLabel}>Lot Number</ThemedText>
                    <ThemedText style={styles.infoValue}>{item.lot_number}</ThemedText>
                  </View>
                ) : null}

                {item.expiry_date ? (
                  <View style={styles.infoCol}>
                    <ThemedText style={styles.infoLabel}>Expires</ThemedText>
                    <ThemedText style={[styles.infoValue, expired && styles.textExpired]}>
                      {new Date(item.expiry_date).toLocaleDateString()}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {item.notes ? (
                <ThemedText style={styles.notesText}>{item.notes}</ThemedText>
              ) : null}
            </TouchableOpacity>
          );
        }}
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
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardExpired: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
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
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeExpired: {
    backgroundColor: '#EF4444',
  },
  badgeLow: {
    backgroundColor: '#F59E0B',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    gap: 16,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  textExpired: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
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
