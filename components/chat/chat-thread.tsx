// CellCultureChatScreen.jsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useCellCultureVoice } from '../../hooks/useCellCultureVoice';

type ChatMessage = {
  role: 'bot' | 'user';
  text: string;
};

type Props = {
  onComplete: (data: Record<string, any>) => void;
  onCancel?: () => void;
};

export default function CellCultureChatScreen({ onComplete, onCancel }: Props) {
  const {
    messages, isListening, liveTranscript,
    startListening, retryStep
  } = useCellCultureVoice(onComplete);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice chat</Text>
        {onCancel ? (
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList<ChatMessage>
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'bot' ? styles.bot : styles.user]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, gap: 8 }}
      />

      {/* Live transcript preview while user is speaking */}
      {isListening && liveTranscript ? (
        <Text style={styles.livePreview}>{liveTranscript}</Text>
      ) : null}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micActive]}
          onPress={startListening}
          disabled={isListening}
        >
          <Text style={styles.micText}>{isListening ? '🎙 Listening...' : '🎤 Tap to Answer'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.retryButton} onPress={retryStep}>
          <Text style={styles.retryText}>Re-answer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  closeButton: { padding: 8 },
  closeButtonText: { color: '#bbb', fontSize: 14 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 12 },
  bot: { backgroundColor: '#1e1e2e', alignSelf: 'flex-start' },
  user: { backgroundColor: '#2a4a3e', alignSelf: 'flex-end' },
  bubbleText: { color: '#fff', fontSize: 15 },
  livePreview: { color: '#888', fontStyle: 'italic', paddingHorizontal: 16, paddingBottom: 8 },
  controls: { padding: 16, gap: 10 },
  micButton: { backgroundColor: '#2e7d52', borderRadius: 12, padding: 16, alignItems: 'center' },
  micActive: { backgroundColor: '#c0392b' },
  micText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  retryButton: { alignItems: 'center' },
  retryText: { color: '#888', fontSize: 14 },
});