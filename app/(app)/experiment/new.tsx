import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ExperimentNotesBlock } from '@/components/experiment-notes-block';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/themed-text-input';
import { normalizeDictationText } from '@/lib/dictation-normalize';
import { useCellLines } from '@/hooks/use-cell-lines';
import { useCreateExperiment } from '@/hooks/use-create-experiment';
import { VoiceChatModal } from '@/components/chat/voice-chat-modal';
import { NEW_EXPERIMENT_VOICE_STEPS } from '@/lib/voice-chat-scripts';
import { useColorScheme } from '@/hooks/use-color-scheme';

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewExperimentScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { data: cellLines, isLoading: loadingCellLines, isError } = useCellLines();
  const createExperiment = useCreateExperiment();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'planned' | 'in_progress' | 'completed'>('planned');
  const [startDate, setStartDate] = useState(todayIso());
  const [selectedCellLineIds, setSelectedCellLineIds] = useState<string[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleCellLine = (id: string) => {
    setSelectedCellLineIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedCount = selectedCellLineIds.length;

  const buttonDisabled = createExperiment.isPending || selectedCount === 0 || !name.trim();

  const canShowCellLines = !loadingCellLines && !!cellLines && !isError;

  const handleChatComplete = (data: Record<string, string>) => {
    if (data.experimentName) setName(String(data.experimentName));
    if (data.description) setDescription(String(data.description));

    if (data.status) {
      const normalized = String(data.status).toLowerCase();
      if (normalized.includes('planned')) setStatus('planned');
      else if (normalized.includes('completed')) setStatus('completed');
      else if (normalized.includes('progress') || normalized.includes('in progress')) setStatus('in_progress');
    }

    if (data.startdate) setStartDate(String(data.startdate));
    setIsChatOpen(false);
  };

  const cardBorderColor = scheme === 'dark' ? '#2D2D2D' : '#E6DCCF';
  const cellLineRowBg = scheme === 'dark' ? '#1C1A17' : '#FFFFFF';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>New experiment</ThemedText>
            <TouchableOpacity 
              onPress={() => setIsChatOpen(true)} 
              style={styles.voiceTitleButton}
              activeOpacity={0.8}
            > 
              <ThemedText type="defaultSemiBold" style={styles.voiceBtnText}>Voice chat</ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.fieldLabel}>Name *</ThemedText>
          <ThemedTextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            onBlur={() => {
              const next = normalizeDictationText(name);
              if (next !== name) setName(next);
            }}
            placeholder="e.g. HeLa drug response - batch 1"
            enableVoice={true}
          />
          
          {/* Voice Chat moved inline with title */}

          <ThemedText style={styles.fieldLabel}>Description</ThemedText>
          <ExperimentNotesBlock
            value={description}
            onChangeText={setDescription}
            inputStyle={[styles.input, styles.multiline]}
            numberOfLines={3}
          />

          <ThemedText style={styles.fieldLabel}>Status</ThemedText>
          <ThemedView style={styles.segmentRow}>
            {(['Planned', 'In Progress', 'Completed'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.segment, 
                  { borderColor: cardBorderColor },
                  status === s.toLowerCase() && styles.segmentActive
                ]}
                onPress={() => setStatus(s.toLowerCase() as any)}
                activeOpacity={0.8}
              >
                <ThemedText 
                  style={status === s.toLowerCase() ? styles.segmentTextActive : { color: '#8C7B70' }}
                  lightColor={status === s.toLowerCase() ? '#FFFFFF' : undefined}
                >
                  {s}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>

          <ThemedText style={styles.fieldLabel}>Start date</ThemedText>
          <ThemedTextInput 
            style={styles.input} 
            value={startDate} 
            onChangeText={setStartDate} 
            placeholder="YYYY-MM-DD" 
            enableVoice={true}
          />

          <ThemedText style={styles.sectionTitle}>
            Cell lines in this experiment * ({selectedCount})
          </ThemedText>

          {canShowCellLines ? (
            cellLines!.map((cl) => {
              const selected = selectedCellLineIds.includes(cl.id);
              return (
                <TouchableOpacity 
                  key={cl.id} 
                  style={[
                    styles.cellLineRow, 
                    { backgroundColor: cellLineRowBg, borderColor: selected ? '#340D0E' : cardBorderColor },
                    selected && styles.cellLineRowSelected
                  ]} 
                  onPress={() => toggleCellLine(cl.id)}
                  activeOpacity={0.7}
                >
                  <ThemedText type="defaultSemiBold">{cl.name}</ThemedText>
                  {cl.organism ? <ThemedText style={{ fontSize: 13, color: '#8C7B70' }}>{cl.organism}</ThemedText> : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <ThemedText style={{ fontStyle: 'italic', opacity: 0.8 }}>Loading cell lines…</ThemedText>
          )}

          {createExperiment.error ? (
            <ThemedText style={styles.errorText}>{(createExperiment.error as Error).message}</ThemedText>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={[styles.actionButton, styles.secondaryButton]}
              activeOpacity={0.8}
            >
              <ThemedText type="defaultSemiBold">Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={buttonDisabled}
              onPress={() =>
                createExperiment.mutateAsync({
                  name,
                  description: description || undefined,
                  status,
                  start_date: startDate,
                  cellLineIds: selectedCellLineIds,
                }).then(() => router.back())
              }
              style={[styles.actionButton, styles.primaryActionButton, buttonDisabled && styles.actionButtonDisabled]}
              activeOpacity={0.85}
            >
              <ThemedText type="defaultSemiBold" lightColor="#FFFFFF">
                {createExperiment.isPending ? 'Creating…' : 'Create experiment'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <VoiceChatModal
          visible={isChatOpen}
          steps={NEW_EXPERIMENT_VOICE_STEPS}
          onComplete={handleChatComplete}
          onClose={() => setIsChatOpen(false)}
        />
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { gap: 10, paddingBottom: 32 },
  input: {
    marginVertical: 2,
  },
  fieldLabel: {
    fontSize: 14,
    marginTop: 8,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  sectionTitle: { marginTop: 16, fontSize: 16 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 4, backgroundColor: 'transparent' },
  segment: { 
    flex: 1, 
    paddingVertical: 10, 
    borderRadius: 999, 
    borderWidth: 1, 
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  segmentActive: { 
    borderWidth: 0,
    backgroundColor: '#340D0E',
  },
  segmentTextActive: { 
    fontWeight: '600',
  },
  cellLineRow: { 
    borderRadius: 14, 
    borderWidth: 1, 
    padding: 14, 
    gap: 2,
    marginVertical: 4,
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cellLineRowSelected: { 
    borderWidth: 2,
  },
  errorText: { color: '#D97706', marginTop: 8, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20, justifyContent: 'flex-end' },
  actionButton: { 
    borderRadius: 999, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleText: {
    marginVertical: 0,
  },
  voiceTitleButton: {
    borderWidth: 1,
    borderColor: '#340D0E',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  voiceBtnText: {
    color: '#340D0E',
    fontSize: 13,
  },
  secondaryButton: { 
    borderWidth: 1,
    borderColor: '#E6DCCF',
  },
  primaryActionButton: { 
    backgroundColor: '#340D0E',
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonDisabled: { opacity: 0.6 },
});
