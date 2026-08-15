import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { setCompletedOnboarding } from '@/lib/onboarding';

const LOGO = require('@/assets/images/CultureTrackerLogo.png');

type IconName = 'mic' | 'alarm' | 'lock' | 'palette';

type Page =
  | {
      key: string;
      variant: 'logo';
      title: string;
      body: string;
    }
  | {
      key: string;
      variant: 'icon';
      icon: IconName;
      title: string;
      body: string;
    };

const PAGES: Page[] = [
  {
    key: 'welcome',
    variant: 'logo',
    title: 'Welcome to CultureTracker',
    body: 'Track cell lines, experiments, and protocols hands-free. Let\'s review our new tools in 30 seconds.',
  },
  {
    key: 'voice-inputs',
    variant: 'icon',
    icon: 'mic',
    title: 'Hands-Free Dictation',
    body: 'Tap the mic icon inside any input to dictate directly, or tap "Voice chat" in the header to run our guided AI form filler hands-free.',
  },
  {
    key: 'timers',
    variant: 'icon',
    icon: 'alarm',
    title: 'Incubation Timers',
    body: 'Say "Set a washing timer for 10 minutes" during notes dictation. Active timers tick on the home dashboard and push notify you upon completion.',
  },
  {
    key: 'privacy',
    variant: 'icon',
    icon: 'lock',
    title: 'Enterprise Safety',
    body: 'Your cell lines and notes are locked in your private database. Speech parsing is processed locally on your device to protect your IP.',
  },
  {
    key: 'customization',
    variant: 'icon',
    icon: 'palette',
    title: 'Profile Customization',
    body: 'Upload custom photos or pick locally bundled scientific sticker presets (DNA double helix, flask, or microscope focus) to personalize your lab profile.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const width = Dimensions.get('window').width;

  const colorScheme = useColorScheme() ?? 'light';
  const tint = '#340D0E';
  const iconMuted = useThemeColor({}, 'icon');
  const borderSubtle = '#E6DCCF';
  const heroBg = '#FFFFFF';

  const finish = async () => {
    await setCompletedOnboarding();
    router.back();
  };

  useEffect(() => {
    if (page < 0) setPage(0);
    if (page > PAGES.length - 1) setPage(PAGES.length - 1);
  }, [page]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: page * width, animated: true });
  }, [page, width]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / width);
    if (next !== page && next >= 0 && next < PAGES.length) {
      setPage(next);
    }
  };

  const goNext = () => setPage((p) => Math.min(PAGES.length - 1, p + 1));
  const goPrev = () => setPage((p) => Math.max(0, p - 1));

  return (
    <ThemedView style={styles.container}>
      <View style={styles.topBar}>
        <ThemedText type="title" style={styles.header}>
          Getting started
        </ThemedText>
        <ThemedText style={styles.stepLabel}>
          {page + 1} / {PAGES.length}
        </ThemedText>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}>
        {PAGES.map((p) => (
          <View key={p.key} style={[styles.page, { width }]}>
            <View style={[styles.hero, { backgroundColor: heroBg }]}>
              {p.variant === 'logo' ? (
                <Image source={LOGO} style={styles.logoImage} contentFit="contain" accessibilityLabel="CultureTracker" />
              ) : (
                <View style={[styles.iconRing, { borderColor: tint }]}>
                  <MaterialIcons name={p.icon} size={64} color={tint} />
                </View>
              )}
            </View>
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
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? tint : 'transparent', borderColor: iconMuted },
                i === page && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          {page > 0 ? (
            <TouchableOpacity
              onPress={goPrev}
              style={[styles.button, styles.secondary, { borderColor: borderSubtle }]}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <ThemedText type="defaultSemiBold">Back</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={finish}
              style={[styles.button, styles.secondary, { borderColor: borderSubtle }]}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <ThemedText type="defaultSemiBold">Skip</ThemedText>
            </TouchableOpacity>
          )}
          {page < PAGES.length - 1 ? (
            <TouchableOpacity
              onPress={goNext}
              style={[styles.button, styles.primaryActionButton]}
              accessibilityRole="button"
              activeOpacity={0.85}
            >
              <ThemedText type="defaultSemiBold" style={{ color: '#FFFFFF' }}>
                Next
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={finish}
              style={[styles.button, styles.primaryActionButton]}
              accessibilityRole="button"
              activeOpacity={0.85}
            >
              <ThemedText type="defaultSemiBold" lightColor="#FFFFFF">
                Done
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  topBar: {
    paddingHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  header: { flex: 1 },
  stepLabel: { fontSize: 14, opacity: 0.7 },
  page: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },
  hero: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 4, textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 24, textAlign: 'center', opacity: 0.92 },
  footer: { padding: 16, gap: 16, paddingBottom: 24 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    opacity: 0.5,
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
    opacity: 1,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  button: { 
    flex: 1, 
    borderRadius: 999, 
    paddingVertical: 14, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#340D0E',
    borderColor: '#340D0E',
    borderWidth: 1,
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  secondary: {
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
});
