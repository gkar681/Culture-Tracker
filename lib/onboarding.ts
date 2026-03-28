import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding.v1.completed';

export async function hasCompletedOnboarding() {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'true';
}

export async function setCompletedOnboarding() {
  await AsyncStorage.setItem(KEY, 'true');
}

export async function resetOnboarding() {
  await AsyncStorage.removeItem(KEY);
}

