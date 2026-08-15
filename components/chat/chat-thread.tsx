import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { VoiceChatStep } from '@/lib/voice-chat-scripts';
import { useCellCultureVoice } from '../../hooks/useCellCultureVoice';

type ChatMessage = {
  role: 'bot' | 'user';
  text: string;
};

type Props = {
  steps: readonly VoiceChatStep[];
  onComplete: (data: Record<string, any>) => void;
  onCancel?: () => void;
};

export default function CellCultureChatScreen({ steps, onComplete, onCancel }: Props) {
  const {
    messages,
    stepIndex,
    totalSteps,
    status,
    error,
    isComplete,
    toggleRecording,
    retryStep,
    modelStatus,
    modelProgress,
    modelSizeLabel,
    whisperConfigured,
    retryModelLoad,
  } = useCellCultureVoice(onComplete, steps);

  const questionNumber = Math.min(stepIndex + 1, totalSteps);
  const isRecording = status === 'recording';
  const isTranscribing = status === 'transcribing';
  const modelReady = modelStatus === 'ready';
  const modelLoading = modelStatus === 'downloading' || modelStatus === 'loading';
  const controlsDisabled = isTranscribing || isComplete || !whisperConfigured || !modelReady;

  let primaryLabel = '🎤 Tap to record answer';
  if (!whisperConfigured) {
    primaryLabel = 'Requires iOS/Android dev build';
  } else if (modelLoading) {
    primaryLabel =
      modelStatus === 'downloading'
        ? `Downloading Whisper (${modelSizeLabel})… ${Math.round(modelProgress * 100)}%`
        : 'Loading Whisper on device…';
  } else if (modelStatus === 'error') {
    primaryLabel = 'Tap to retry model download';
  } else if (isRecording) {
    primaryLabel = '⏹ Tap when done speaking';
  } else if (isTranscribing) {
    primaryLabel = 'Transcribing on device…';
  } else if (isComplete) {
    primaryLabel = 'All questions answered';
  }

  const handlePrimaryPress = () => {
    if (modelStatus === 'error') {
      void retryModelLoad();
      return;
    }
    void toggleRecording();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Voice chat</Text>
          {totalSteps > 0 ? (
            <Text style={styles.progress}>
              Question {questionNumber} of {totalSteps}
            </Text>
          ) : null}
          <Text style={styles.subtitle}>On-device Whisper · {modelSizeLabel} model (one-time download)</Text>
        </View>
        {onCancel ? (
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {modelLoading ? (
        <View style={styles.modelBanner}>
          <ActivityIndicator color="#8fbc8f" size="small" />
          <Text style={styles.modelBannerText}>
            {modelStatus === 'downloading'
              ? `Downloading ${modelSizeLabel} model… ${Math.round(modelProgress * 100)}%`
              : 'Loading model into memory…'}
          </Text>
        </View>
      ) : null}

      <FlatList<ChatMessage>
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'bot' ? styles.bot : styles.user]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.micButton,
            isRecording && styles.micActive,
            (controlsDisabled && modelStatus !== 'error') && styles.micDisabled,
          ]}
          onPress={handlePrimaryPress}
          disabled={controlsDisabled && modelStatus !== 'error'}
          accessibilityLabel={isRecording ? 'Stop recording' : 'Record answer'}
        >
          {isTranscribing || modelLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.micText}>{primaryLabel}</Text>
          )}
        </TouchableOpacity>

        {!isComplete ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={retryStep}
            disabled={isRecording || isTranscribing || !modelReady}
          >
            <Text style={styles.retryText}>Re-answer this question</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  progress: { color: '#888', fontSize: 13, marginTop: 4 },
  subtitle: { color: '#666', fontSize: 12, marginTop: 2 },
  closeButton: { padding: 8 },
  closeButtonText: { color: '#bbb', fontSize: 14 },
  modelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modelBannerText: { color: '#aaa', fontSize: 13, flex: 1 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 12 },
  bot: { backgroundColor: '#1e1e2e', alignSelf: 'flex-start' },
  user: { backgroundColor: '#2a4a3e', alignSelf: 'flex-end' },
  bubbleText: { color: '#fff', fontSize: 15 },
  errorText: { color: '#f87171', paddingHorizontal: 16, paddingBottom: 8, fontSize: 14 },
  controls: { padding: 16, gap: 10 },
  micButton: {
    backgroundColor: '#2e7d52',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  micActive: { backgroundColor: '#c0392b' },
  micDisabled: { opacity: 0.55 },
  micText: { color: '#fff', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  retryButton: { alignItems: 'center' },
  retryText: { color: '#888', fontSize: 14 },
});
