import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCellLine } from '@/hooks/use-cell-line';
import { useCellLineDocs, useUploadCellLineDoc } from '@/hooks/use-cell-line-docs';
import { supabase } from '@/lib/supabase';

export default function CellLineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: cellLine, isLoading, isError, error } = useCellLine(id ?? null);
  const { data: docs } = useCellLineDocs(id ?? null);
  const { mutateAsync: uploadDoc, isPending: uploading } = useUploadCellLineDoc(id ?? null);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Loading…</ThemedText>
      </ThemedView>
    );
  }

  if (isError || !cellLine) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{(error as Error)?.message ?? 'Cell line not found'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText type="defaultSemiBold">{'‹ Back to list'}</ThemedText>
        </TouchableOpacity>

        <ThemedText type="title" style={styles.title}>
          {cellLine.name}
        </ThemedText>
        <ThemedText>
          {cellLine.organism ?? 'Unknown organism'} · {cellLine.tissue_type ?? 'Unknown tissue'}
        </ThemedText>
        <ThemedText>
          Morphology: {cellLine.morphology ?? 'Unknown'} · Doubling time:{' '}
          {cellLine.doubling_time_hours != null ? `${cellLine.doubling_time_hours} h` : 'Unknown'}
        </ThemedText>

        {cellLine.notes ? (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Notes</ThemedText>
            <ThemedText>{cellLine.notes}</ThemedText>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Spec sheets & docs</ThemedText>
            <TouchableOpacity disabled={uploading} onPress={() => uploadDoc()}>
              <ThemedText type="defaultSemiBold">
                {uploading ? 'Uploading…' : 'Attach PDF / photo'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          {docs && docs.length > 0 ? (
            docs.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.docRow}
                onPress={async () => {
                  const { data } = await supabase.storage
                    .from('cell_line_docs')
                    .createSignedUrl(doc.storage_path, 60 * 10);
                  if (data?.signedUrl) {
                    Linking.openURL(data.signedUrl);
                  }
                }}>
                <ThemedText>
                  {doc.mime_type === 'application/pdf' ? 'PDF' : 'Image'} ·{' '}
                  {new Date(doc.created_at).toLocaleDateString()}
                </ThemedText>
              </TouchableOpacity>
            ))
          ) : (
            <ThemedText>No docs attached yet.</ThemedText>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  content: {
    gap: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 8,
  },
  section: {
    marginTop: 16,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docRow: {
    paddingVertical: 8,
  },
});

