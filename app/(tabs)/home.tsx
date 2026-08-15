import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { VictoryAxis, VictoryChart, VictoryLine, VictoryScatter } from 'victory-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCellLines } from '@/hooks/use-cell-lines';
import { useExperiments } from '@/hooks/use-experiments';
import { useReagents } from '@/hooks/use-reagents';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/lib/supabase';
import { useTimerStore } from '@/lib/timer-store';

// Standard scientific cell growth curve data (Lag -> Log -> Stationary phases)
const MOCK_GROWTH_CURVE = [
  { x: 1, y: 10 },  // Lag phase
  { x: 2, y: 22 },  // Entering Log phase
  { x: 3, y: 55 },  // Exponential Log phase
  { x: 4, y: 82 },  // Approaching confluence
  { x: 5, y: 92 },  // Stationary phase
  { x: 6, y: 95 },  // Fully confluent
];

function formatTimeLeft(expiresAt: number) {
  const diffMs = expiresAt - Date.now();
  if (diffMs <= 0) return '00:00';
  const totalSecs = Math.floor(diffMs / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  
  const pad = (n: number) => String(n).padStart(2, '0');
  
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { timers, cancelTimer } = useTimerStore();
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('terms_accepted').then((val) => {
      if (val !== 'true') {
        setShowTermsModal(true);
      }
    });
  }, []);
  
  // Fetch real data for counters
  const { data: cellLines, isLoading: cellLinesLoading } = useCellLines();
  const { data: experiments } = useExperiments();
  const { data: reagents } = useReagents();
  const { data: profile } = useProfile();

  const activeCellLinesCount = cellLines?.length ?? 0;
  const ongoingExperimentsCount = experiments?.filter(e => e.status === 'in_progress').length ?? 0;
  const reagentsCount = reagents?.length ?? 0;

  const userName = profile?.display_name ?? 'Researcher';
  const labName = profile?.lab_name ?? 'My Lab';

  // Fetch real recent confluency records across all cell lines
  const { data: passages } = useQuery({
    queryKey: ['recent_passages_home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('passages')
        .select('id, passage_date, confluence_at_passage, cell_lines(name)')
        .order('passage_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    }
  });

  const recentCellLines = cellLines?.slice(0, 2) ?? [];

  // Determine if we should render real data or mock growth curve
  const hasRealData = passages && passages.length > 1 && passages.some(p => p.confluence_at_passage != null);

  const chartData = hasRealData
    ? passages
        .filter(p => p.confluence_at_passage != null)
        .map((p, idx) => ({
          x: idx + 1,
          y: Number(p.confluence_at_passage),
          label: (Array.isArray(p.cell_lines) ? p.cell_lines[0]?.name : (p.cell_lines as any)?.name) ?? 'Cell',
        }))
    : MOCK_GROWTH_CURVE;

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      {/* Header Section */}
      <ThemedView style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('@/assets/images/cute_cell_character.jpg')} 
            style={styles.mascotAvatar} 
          />
          <View>
            <ThemedText style={styles.welcomeText}>WELCOME TO YOUR HOOD</ThemedText>
            <ThemedText type="title" style={styles.userNameText}>{userName}</ThemedText>
            <ThemedText style={styles.labText}>{labName.toUpperCase()}</ThemedText>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.onboardingBtn} 
          onPress={() => router.push('/(app)/onboarding')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="help-outline" size={22} color="#340D0E" />
        </TouchableOpacity>
      </ThemedView>

      {/* Stats Cards Section */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <MaterialIcons name="science" size={18} color="#340D0E" />
            <ThemedText style={styles.statLabel}>Cell Lines</ThemedText>
          </View>
          <ThemedText style={styles.statNumber}>{activeCellLinesCount}</ThemedText>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <MaterialIcons name="biotech" size={18} color="#340D0E" />
            <ThemedText style={styles.statLabel}>Ongoing Exps</ThemedText>
          </View>
          <ThemedText style={styles.statNumber}>{ongoingExperimentsCount}</ThemedText>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <MaterialIcons name="inventory" size={18} color="#340D0E" />
            <ThemedText style={styles.statLabel}>Reagents</ThemedText>
          </View>
          <ThemedText style={styles.statNumber}>{reagentsCount}</ThemedText>
        </View>
      </View>

      {/* Active Timers Widget */}
      {timers.length > 0 ? (
        <View style={styles.timersContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Active Timers</ThemedText>
          {timers.map((t) => (
            <View key={t.id} style={styles.timerRow}>
              <View style={styles.timerRowLeft}>
                <MaterialIcons name="alarm-on" size={20} color="#340D0E" style={styles.timerAlarmIcon} />
                <View>
                  <ThemedText type="defaultSemiBold" style={styles.timerLabel}>{t.label}</ThemedText>
                  <ThemedText style={styles.timerProgress}>
                    Total: {t.totalDurationSeconds >= 3600
                      ? `${(t.totalDurationSeconds / 3600).toFixed(1)}h`
                      : t.totalDurationSeconds >= 60
                      ? `${Math.floor(t.totalDurationSeconds / 60)}m`
                      : `${t.totalDurationSeconds}s`}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.timerRowRight}>
                <ThemedText style={styles.timerTime}>{formatTimeLeft(t.expiresAt)}</ThemedText>
                <TouchableOpacity onPress={() => cancelTimer(t.id)} style={styles.cancelTimerBtn} activeOpacity={0.7}>
                  <MaterialIcons name="close" size={16} color="#8C7B70" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Dynamic Graph Section */}
      <View style={styles.graphContainer}>
        <View style={styles.graphHeader}>
          <ThemedText type="defaultSemiBold" style={styles.graphTitle}>
            {hasRealData ? 'Recent Growth Curves' : 'Typical Cell Growth Curve'}
          </ThemedText>
          {!hasRealData && (
            <View style={styles.referenceBadge}>
              <ThemedText style={styles.referenceText}>DEMO REFERENCE</ThemedText>
            </View>
          )}
        </View>
        
        <View style={styles.chartWrapper}>
          <VictoryChart height={170} padding={{ top: 10, bottom: 30, left: 35, right: 20 }}>
            <VictoryAxis 
              tickFormat={(val) => `D${val}`} 
              style={{
                axis: { stroke: '#E6DCCF' },
                tickLabels: { fontSize: 9, fill: '#8C7B70' }
              }}
            />
            <VictoryAxis 
              dependentAxis 
              tickFormat={(val) => `${val}%`}
              style={{
                axis: { stroke: '#E6DCCF' },
                tickLabels: { fontSize: 9, fill: '#8C7B70' }
              }}
            />
            <VictoryLine
              data={chartData}
              style={{
                data: { stroke: '#340D0E', strokeWidth: 2.5 }
              }}
            />
            <VictoryScatter
              data={chartData}
              size={4.5}
              style={{
                data: { fill: '#340D0E' }
              }}
            />
          </VictoryChart>
        </View>
        {!hasRealData && (
          <ThemedText style={styles.graphCaption}>
            Lag phase (Day 1) leads to exponential Log growth (Days 2-4). Log confluency in your cell lines to see live trends.
          </ThemedText>
        )}
      </View>

      {/* Primary Voice Log CTA */}
      <TouchableOpacity 
        style={styles.voiceCard} 
        onPress={() => router.push('/(app)/chat')}
        activeOpacity={0.9}
      >
        <View style={styles.voiceCardLeft}>
          <View style={styles.micCircle}>
            <MaterialIcons name="mic" size={24} color="#340D0E" />
          </View>
        </View>
        <View style={styles.voiceCardRight}>
          <ThemedText type="defaultSemiBold" style={styles.voiceCardTitle}>
            Hands-Free Voice Log
          </ThemedText>
          <ThemedText style={styles.voiceCardSub}>
            Speak out split ratios, confluence, or media changes.
          </ThemedText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" style={styles.chevron} />
      </TouchableOpacity>

      {/* Quick Action Grid */}
      <View>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/(app)/cell-line/new')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCardHeader}>
              <MaterialIcons name="add-box" size={20} color="#340D0E" />
              <ThemedText type="defaultSemiBold" style={styles.actionText}>Add Cell Line</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/(app)/experiment/new')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCardHeader}>
              <MaterialIcons name="create" size={20} color="#340D0E" />
              <ThemedText type="defaultSemiBold" style={styles.actionText}>New Experiment</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/(tabs)/protocols')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCardHeader}>
              <MaterialIcons name="menu-book" size={20} color="#340D0E" />
              <ThemedText type="defaultSemiBold" style={styles.actionText}>Run Protocols</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/(tabs)/reagents')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCardHeader}>
              <MaterialIcons name="shopping-bag" size={20} color="#340D0E" />
              <ThemedText type="defaultSemiBold" style={styles.actionText}>View Reagents</ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity Section */}
      <View style={styles.recentSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Recently Logged Cell Lines</ThemedText>
        {recentCellLines.length > 0 ? (
          recentCellLines.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.activityCard}
              onPress={() => router.push({ pathname: '/(app)/cell-line/[id]', params: { id: item.id } })}
              activeOpacity={0.8}
            >
              <View style={styles.activityCardLeft}>
                <View style={styles.bulletIndicator} />
                <View>
                  <ThemedText type="defaultSemiBold" style={styles.activityTitle}>{item.name}</ThemedText>
                  <ThemedText style={styles.activitySubtitle}>
                    {item.organism ?? 'Unknown species'} • {item.tissue_type ?? 'Unknown tissue'}
                  </ThemedText>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#340D0E" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyActivityCard}>
            <ThemedText style={styles.emptyActivityText}>
              {cellLinesLoading ? 'Loading cell lines...' : 'No cell lines logged yet.'}
            </ThemedText>
          </View>
        )}
      </View>

      <Modal
        visible={showTermsModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=150' }}
              style={styles.modalMascot}
            />
            <ThemedText type="subtitle" style={styles.modalTitle}>Welcome to CultureTracker</ThemedText>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              <ThemedText type="defaultSemiBold" style={styles.modalSubTitle}>🔒 Privacy Notice</ThemedText>
              <ThemedText style={styles.modalBodyText}>
                We prioritize your intellectual property. All experimental notes, cell line records, and laboratory data are stored in your secure private database. Custom voice commands and dictations are processed locally on-device and never shared with third parties.
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.modalSubTitle}>📜 Terms of Service</ThemedText>
              <ThemedText style={styles.modalBodyText}>
                By accepting below, you agree that you use CultureTracker entirely at your own risk. You hereby absolve CultureTracker, its developers, authors, and collaborators of any and all liability, including but not limited to loss of scientific research data, experiment contamination, cell line failures, or standard protocol complications.
              </ThemedText>
            </ScrollView>
            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('terms_accepted', 'true');
                setShowTermsModal(false);
              }}
              style={styles.modalButton}
              activeOpacity={0.85}
            >
              <ThemedText type="defaultSemiBold" style={styles.modalBtnText}>I Accept & Proceed</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  container: {
    padding: 18,
    gap: 22,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mascotAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E6DCCF',
  },
  welcomeText: {
    fontSize: 10,
    color: '#8C7B70',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  userNameText: {
    fontSize: 32,
    lineHeight: 36,
    color: '#340D0E',
  },
  labText: {
    fontSize: 11,
    color: '#8C7B70',
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  onboardingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 12,
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#8C7B70',
    fontWeight: '600',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#340D0E',
    fontFamily: 'Oswald_700Bold',
  },
  graphContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 8,
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  graphTitle: {
    fontSize: 16,
    color: '#340D0E',
  },
  referenceBadge: {
    backgroundColor: '#E6DCCF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  referenceText: {
    color: '#340D0E',
    fontSize: 9,
    fontWeight: 'bold',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -8,
  },
  graphCaption: {
    fontSize: 11,
    color: '#8C7B70',
    lineHeight: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  voiceCard: {
    flexDirection: 'row',
    backgroundColor: '#340D0E',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  voiceCardLeft: {
    marginRight: 14,
  },
  micCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCardRight: {
    flex: 1,
  },
  voiceCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 2,
  },
  voiceCardSub: {
    color: '#E6DCCF',
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#340D0E',
    marginBottom: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    backgroundColor: '#FFFFFF',
    padding: 14,
    minHeight: 60,
    justifyContent: 'center',
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionText: {
    fontSize: 14,
    color: '#340D0E',
  },
  recentSection: {
    gap: 2,
  },
  activityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    padding: 14,
    marginBottom: 8,
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  activityCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#340D0E',
  },
  activityTitle: {
    fontSize: 15,
    color: '#340D0E',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#8C7B70',
    marginTop: 2,
  },
  emptyActivityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActivityText: {
    color: '#8C7B70',
    fontSize: 13,
    fontStyle: 'italic',
  },
  timersContainer: {
    gap: 8,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  timerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerAlarmIcon: {
    opacity: 0.9,
  },
  timerLabel: {
    fontSize: 15,
    color: '#340D0E',
  },
  timerProgress: {
    fontSize: 11,
    color: '#8C7B70',
    marginTop: 2,
  },
  timerRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#340D0E',
    fontFamily: 'Oswald_700Bold',
  },
  cancelTimerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FAF7F2',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6DCCF',
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  modalMascot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
  },
  modalTitle: {
    color: '#340D0E',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    width: '100%',
    maxHeight: 250,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  modalScrollContent: {
    padding: 12,
    gap: 8,
  },
  modalSubTitle: {
    fontSize: 14,
    color: '#340D0E',
    marginTop: 4,
  },
  modalBodyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8C7B70',
    marginBottom: 8,
  },
  modalButton: {
    backgroundColor: '#340D0E',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  modalBtnText: {
    color: '#FFFFFF',
  },
});
