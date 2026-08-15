import { useRouter } from 'expo-router';

import ChatThread from '@/components/chat/chat-thread';
import { NEW_EXPERIMENT_VOICE_STEPS } from '@/lib/voice-chat-scripts';

export default function ChatScreen() {
  const router = useRouter();

  return <ChatThread steps={NEW_EXPERIMENT_VOICE_STEPS} onComplete={() => router.back()} />;
}
