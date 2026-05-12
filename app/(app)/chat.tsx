import { useRouter } from 'expo-router';

import ChatThread from '@/components/chat/chat-thread';

export default function ChatScreen() {
  const router = useRouter();

  return <ChatThread onComplete={() => router.back()} />;
}
