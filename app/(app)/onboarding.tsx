import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { setCompletedOnboarding } from '@/lib/onboarding';

const PAGES = [
  {
    title: 'Welcome to CultureTracker',
    body: 'Track cell lines and experiments in one place. This walkthrough takes ~30 seconds.',
  },
  {
    title: '1) Add your cell lines',
    body: 'Go to Cell Lines → + Add. Type a name or use catalog autocomplete. Optional: attach a spec sheet.',
  },
  {
    title: '2) Create an experiment',
    body: 'Go to Experiments → + New. Select the cell lines involved (control vs treatment).',
  },
  {
    title: '3) Log what you do',
    body: 'Inside an experiment, add Passages, Observations, Cell Counts, Treatments, and Images. Use the section switcher to keep it focused.',
  },
  {
    title: '4) See trends automatically',
    body: 'Graphs update from your logs (confluence, cells/mL, viability). Treatments show on the timeline.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const width = Dimensions.get('window').width;

  const finish = async () => {
    await setCompletedOnboarding();
    router.back();
  };

  useEffect(() => {
    // If user swipes quickly, keep page bounds safe
    if (page < 0) setPage(0);
    if (page > PAGES.length - 1) setPage(PAGES.length - 1);
  }, [page]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>
        Getting started
      </ThemedText>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const next = Math.round(x / width);
          if (next !== page) setPage(next);
        }}
        scrollEventThrottle={16}>
        {PAGES.map((p) => (
          <View key={p.title} style={[styles.page, { width }]}>
            <ThemedText type="title" style={styles.title}>
              {p.title}
            </ThemedText>
            <ThemedText style={styles.body}>{p.body}</ThemedText>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={finish} style={[styles.button, styles.secondary]}>
            <ThemedText type="defaultSemiBold">Skip</ThemedText>
          </TouchableOpacity>
          {page < PAGES.length - 1 ? (
            <TouchableOpacity onPress={() => setPage((p) => Math.min(PAGES.length - 1, p + 1))} style={[styles.button, styles.primary]}>
              <ThemedText type="defaultSemiBold">Next</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={finish} style={[styles.button, styles.primary]}>
              <ThemedText type="defaultSemiBold">Done</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  page: { paddingHorizontal: 16, paddingVertical: 24, gap: 12 },
  title: { marginTop: 8 },
  body: { fontSize: 16, lineHeight: 22 },
  footer: { padding: 16, gap: 12 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 99, borderWidth: 1, opacity: 0.4 },
  dotActive: { opacity: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  button: { flex: 1, borderRadius: 999, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  primary: { borderWidth: 2 },
  secondary: {},
});

