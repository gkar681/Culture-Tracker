import { Stack } from 'expo-router';

import { ProtectedRoute } from '@/lib/auth';

export default function AppLayout() {
  return (
    <ProtectedRoute>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{
            presentation: 'modal',
            title: 'Getting started',
          }}
        />
        <Stack.Screen
          name="cell-line/new"
          options={{
            presentation: 'modal',
            title: 'New Cell Line',
          }}
        />
        <Stack.Screen
          name="experiment/new"
          options={{
            title: 'New Experiment',
          }}
        />
        <Stack.Screen
          name="chat"
          options={{
            title: 'Chat',
          }}
        />
        <Stack.Screen
          name="experiment/[id]"
          options={{
            title: 'Experiment',
          }}
        />
      </Stack>
    </ProtectedRoute>
  );
}

