import { ActivityIndicator, Modal, Platform, StyleSheet, View } from 'react-native';
import { lazy, Suspense } from 'react';

import type { VoiceChatStep } from '@/lib/voice-chat-scripts';

const ChatThread = lazy(() => import('@/components/chat/chat-thread'));

type Props = {
  visible: boolean;
  steps: readonly VoiceChatStep[];
  onComplete: (data: Record<string, string>) => void;
  onClose: () => void;
};

/**
 * Voice chat in a modal. Lazy-loads ChatThread so create screens do not pull in
 * whisper.rn (native) until the user opens voice chat.
 */
export function VoiceChatModal({ visible, steps, onComplete, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen">
      {visible ? (
        <View style={styles.container}>
          <Suspense
            fallback={
              <View style={styles.loading}>
                <ActivityIndicator color="#8fbc8f" size="large" />
              </View>
            }
          >
            <ChatThread steps={steps} onComplete={onComplete} onCancel={onClose} />
          </Suspense>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090909', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
