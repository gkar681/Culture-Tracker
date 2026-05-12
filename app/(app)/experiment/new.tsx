import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ExperimentNotesBlock } from '@/components/experiment-notes-block';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VoiceInputButton } from '@/components/voice-input';
import { normalizeDictationText } from '@/lib/dictation-normalize';
import { useCellLines } from '@/hooks/use-cell-lines';
import { useCreateExperiment } from '@/hooks/use-create-experiment';
import ChatThread from '@/components/chat/chat-thread';

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewExperimentScreen() {
  const router = useRouter();
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

  const handleChatComplete = (data: Record<string, any>) => {
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

  




  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">New experiment</ThemedText>

          <ThemedText>Name *</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            onBlur={() => {
              const next = normalizeDictationText(name);
              if (next !== name) setName(next);
            }}
            placeholder="e.g. HeLa drug response - batch 1"
          />
          <VoiceInputButton value={name} onChangeText={setName} append={false} />
          
          <View>
            <TouchableOpacity onPress={() => setIsChatOpen(true)} style={[styles.actionButton, styles.secondaryButton]}> 
              <ThemedText type="defaultSemiBold">Voice chat</ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText>Description</ThemedText>
          <ExperimentNotesBlock
            value={description}
            onChangeText={setDescription}
            inputStyle={[styles.input, styles.multiline]}
            numberOfLines={3}
          />

          <ThemedText>Status</ThemedText>
          <ThemedView style={styles.segmentRow}>
            {(['Planned', 'In Progress', 'Completed'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.segment, status === s.toLowerCase() && styles.segmentActive]}
                onPress={() => setStatus(s.toLowerCase() as any)}>
                <ThemedText style={status === s.toLowerCase() ? styles.segmentTextActive : undefined}>{s}</ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>

          <ThemedText>Start date</ThemedText>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />

          <ThemedText style={styles.sectionTitle}>
            Cell lines in this experiment * ({selectedCount})
          </ThemedText>

          {canShowCellLines ? (
            cellLines!.map((cl) => {
              const selected = selectedCellLineIds.includes(cl.id);
              return (
                <TouchableOpacity key={cl.id} style={[styles.cellLineRow, selected && styles.cellLineRowSelected]} onPress={() => toggleCellLine(cl.id)}>
                  <ThemedText type="defaultSemiBold">{cl.name}</ThemedText>
                  {cl.organism ? <ThemedText>{cl.organism}</ThemedText> : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <ThemedText>Loading cell lines…</ThemedText>
          )}

          {createExperiment.error ? (
            <ThemedText style={styles.errorText}>{(createExperiment.error as Error).message}</ThemedText>
          ) : null}

          <ThemedView style={styles.actions}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.actionButton, styles.secondaryButton]}>
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
              style={[styles.actionButton, buttonDisabled && styles.actionButtonDisabled]}>
              <ThemedText type="defaultSemiBold">{createExperiment.isPending ? 'Creating…' : 'Create experiment'}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      <Modal visible={isChatOpen} animationType="slide" presentationStyle="overFullScreen">
        <View style={styles.chatModalContainer}>
          <View style={styles.chatModalHeader}>
            <ThemedText type="title">Voice chat</ThemedText>
            <TouchableOpacity onPress={() => setIsChatOpen(false)} style={styles.chatModalClose}>
              <ThemedText>Close</ThemedText>
            </TouchableOpacity>
          </View>
          <ChatThread onComplete={handleChatComplete} onCancel={() => setIsChatOpen(false)} />
        </View>
      </Modal>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { gap: 10, paddingBottom: 32 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'PlayfairDisplay_400Regular', color: 'indigo' },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  sectionTitle: { marginTop: 10 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  segmentActive: { borderWidth: 0 },
  segmentTextActive: { fontWeight: '600' },
  cellLineRow: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 2 },
  cellLineRowSelected: { borderWidth: 2 },
  errorText: { color: 'red', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12, justifyContent: 'flex-end' },
  actionButton: { borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  secondaryButton: { borderWidth: 1 },
  primaryButton: { fontWeight: '600' },
  chatModalContainer: { flex: 1, backgroundColor: '#090909', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  chatModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  chatModalClose: { padding: 8 },
  actionButtonDisabled: { opacity: 0.6 },
});

