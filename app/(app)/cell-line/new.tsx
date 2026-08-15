import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

import { ExperimentNotesBlock } from '@/components/experiment-notes-block';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/themed-text-input';
import { normalizeDictationText } from '@/lib/dictation-normalize';
import { useCreateCellLine } from '@/hooks/use-create-cell-line';
import { useCellLineCatalog } from '@/hooks/use-cell-line-catalog';
import { useCellLineCatalogSearch } from '@/hooks/use-cell-line-catalog-search';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { VoiceChatModal } from '@/components/chat/voice-chat-modal';
import { NEW_CELL_LINE_VOICE_STEPS } from '@/lib/voice-chat-scripts';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NewCellLineScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { mutateAsync, isPending, error } = useCreateCellLine();

  const [name, setName] = useState('');
  const [organism, setOrganism] = useState('');
  const [tissueType, setTissueType] = useState('');
  const [morphology, setMorphology] = useState('');
  const [doublingTime, setDoublingTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { data: catalogMatch } = useCellLineCatalog(name);
  const { data: searchResults } = useCellLineCatalogSearch(name);
  const { user } = useAuth();

  useEffect(() => {
    if (!catalogMatch) return;

    // Only fill fields the user hasn't touched yet
    setOrganism((prev) => prev || catalogMatch.organism || '');
    setTissueType((prev) => prev || catalogMatch.tissue_type || '');
    setMorphology((prev) => prev || catalogMatch.morphology || '');
    setDoublingTime((prev) =>
      prev || (catalogMatch.typical_doubling_hrs != null ? String(catalogMatch.typical_doubling_hrs) : ''),
    );
  }, [catalogMatch]);

  const handleChatComplete = (data: Record<string, string>) => {
    if (data.cellType) setName(String(data.cellType));
    if (data.organism) setOrganism(String(data.organism));
    if (data.tissue) setTissueType(String(data.tissue));
    if (data.morphology) setMorphology(String(data.morphology));
    if (data.doublingTime) setDoublingTime(String(data.doublingTime));
    if (data.notes) setNotes(String(data.notes));
    setIsChatOpen(false);
  };

  const buildPayload = () => ({
    name: normalizeDictationText(name).trim(),
    organism: organism.trim() || undefined,
    tissue_type: tissueType.trim() || undefined,
    morphology: morphology.trim() || undefined,
    doubling_time_hours: doublingTime ? Number(doublingTime) : null,
    notes: notes.trim() ? normalizeDictationText(notes).trim() : undefined,
  });

  const maybeSaveTemplate = async (payload: ReturnType<typeof buildPayload>) => {
    if (catalogMatch || !saveAsTemplate) return;

    const { error: catalogError } = await supabase.from('cell_line_catalog').insert({
      name: payload.name,
      organism: payload.organism ?? null,
      tissue_type: payload.tissue_type ?? null,
      morphology: payload.morphology ?? null,
      typical_doubling_hrs: payload.doubling_time_hours ?? null,
      source: 'user',
    });

    if (catalogError) {
      console.warn('Failed to save cell line template', catalogError.message);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    const payload = buildPayload();

    await mutateAsync(payload);
    await maybeSaveTemplate(payload);

    router.back();
  };

  const handleSaveAndAttach = async () => {
    if (!name.trim()) {
      return;
    }

    const payload = buildPayload();
    const created = await mutateAsync(payload);
    await maybeSaveTemplate(payload);

    if (!created || !user) {
      router.back();
      return;
    }

    // Let user pick a PDF or high-quality image spec sheet right after creating the cell line.
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const mimeType = asset.mimeType ?? 'application/octet-stream';

      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = asset.name?.split('.').pop() ?? (mimeType === 'application/pdf' ? 'pdf' : 'bin');
      const objectPath = `${user.id}/${created.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cell_line_docs')
        .upload(objectPath, blob, {
          contentType: mimeType,
        });

      if (!uploadError) {
        const { error: insertError } = await supabase.from('cell_line_docs').insert({
          cell_line_id: created.id,
          storage_path: objectPath,
          mime_type: mimeType,
          uploaded_by: user.id,
        });

        if (insertError) {
          console.warn('Failed to save spec sheet metadata', insertError.message);
        }
      } else {
        console.warn('Failed to upload spec sheet', uploadError.message);
      }
    }

    router.back();
  };

  const suggestionBg = scheme === 'dark' ? '#252320' : '#FFFFFF';
  const suggestionBorder = scheme === 'dark' ? '#3B3834' : '#E6DCCF';

  const showSuggestions =
    searchResults &&
    searchResults.length > 0 &&
    !(searchResults.length === 1 && searchResults[0].name.toLowerCase() === name.toLowerCase().trim());

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>New Cell Line</ThemedText>
            <TouchableOpacity 
              onPress={() => setIsChatOpen(true)} 
              style={styles.voiceTitleButton}
              activeOpacity={0.8}
            > 
              <ThemedText type="defaultSemiBold" style={styles.voiceBtnText}>Voice chat</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <ThemedText>Name *</ThemedText>
              {catalogMatch ? (
                <ThemedText type="defaultSemiBold" style={styles.catalogTag}>
                  From catalog
                </ThemedText>
              ) : null}
            </View>
            <ThemedTextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              onBlur={() => {
                const next = normalizeDictationText(name);
                if (next !== name) setName(next);
              }}
              placeholder="HeLa, HEK293..."
              enableVoice={true}
            />
            {showSuggestions ? (
              <View style={[styles.suggestions, { backgroundColor: suggestionBg, borderColor: suggestionBorder }]}>
                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.name}
                    style={[styles.suggestionItem, { borderBottomColor: suggestionBorder }]}
                    onPress={() => {
                      setName(result.name);
                    }}
                  >
                    <ThemedText type="defaultSemiBold">{result.name}</ThemedText>
                    {result.organism ? (
                      <ThemedText style={{ fontSize: 12, opacity: 0.8 }}>
                        {result.organism}
                      </ThemedText>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          {/* Voice Chat moved inline with title */}

          <View style={styles.field}>
            <ThemedText>Organism</ThemedText>
            <ThemedTextInput
              style={styles.input}
              value={organism}
              onChangeText={setOrganism}
              placeholder="Human, Mouse..."
              enableVoice={true}
            />
          </View>
          <View style={styles.field}>
            <ThemedText>Tissue type</ThemedText>
            <ThemedTextInput
              style={styles.input}
              value={tissueType}
              onChangeText={setTissueType}
              placeholder="Cervical, Kidney..."
              enableVoice={true}
            />
          </View>
          <View style={styles.field}>
            <ThemedText>Morphology</ThemedText>
            <ThemedTextInput
              style={styles.input}
              value={morphology}
              onChangeText={setMorphology}
              placeholder="Adherent, Suspension..."
              enableVoice={true}
            />
          </View>
          <View style={styles.field}>
            <ThemedText>Doubling time (hours)</ThemedText>
            <ThemedTextInput
              style={styles.input}
              value={doublingTime}
              onChangeText={setDoublingTime}
              keyboardType="numeric"
              placeholder="e.g. 24"
              enableVoice={true}
            />
          </View>
          <View style={styles.field}>
            <ThemedText>Notes</ThemedText>
            <ExperimentNotesBlock
              value={notes}
              onChangeText={setNotes}
              inputStyle={[styles.input, styles.notesInput]}
              placeholder="Any important details…"
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            disabled={isPending}
            onPress={isPending ? undefined : handleSaveAndAttach}
            style={[styles.attachButton, isPending && styles.attachButtonDisabled]}
          >
            <ThemedText type="defaultSemiBold" style={styles.attachButtonText}>
              Attach spec sheet (optional)
            </ThemedText>
          </TouchableOpacity>

          {error ? <ThemedText style={styles.errorText}>{(error as Error).message}</ThemedText> : null}
          <View style={styles.actions}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={[styles.button, styles.secondaryButton]}
              activeOpacity={0.8}
            >
              <ThemedText type="defaultSemiBold">Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isPending}
              onPress={isPending ? undefined : handleSave}
              style={[styles.button, styles.primaryActionButton, isPending && styles.buttonDisabled]}
              activeOpacity={0.85}
            >
              <ThemedText type="defaultSemiBold" lightColor="#FFFFFF">
                {isPending ? 'Saving…' : 'Save'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <VoiceChatModal
          visible={isChatOpen}
          steps={NEW_CELL_LINE_VOICE_STEPS}
          onComplete={handleChatComplete}
          onClose={() => setIsChatOpen(false)}
        />
      </ThemedView>
    </KeyboardAvoidingView>
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
  field: {
    gap: 6,
  },
  input: {
    marginVertical: 2,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catalogTag: {
    fontSize: 12,
  },
  suggestions: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#340D0E',
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#E6DCCF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: 'red',
  },
  attachButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachButtonDisabled: {
    opacity: 0.6,
  },
  attachButtonText: {
    textAlign: 'center',
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
});
