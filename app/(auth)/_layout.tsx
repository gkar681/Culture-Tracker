import { Stack } from 'expo-router';

import { PublicOnlyRoute } from '@/lib/auth';

export default function AuthLayout() {
  return (
    <PublicOnlyRoute>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack>
    </PublicOnlyRoute>
  );
}

