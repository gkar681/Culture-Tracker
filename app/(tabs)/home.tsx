import { StyleSheet, TouchableOpacity, Image, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">CultureTracker</ThemedText>
    

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/onboarding')}>
        <View style={styles.buttonContent}>
          <Image source={require('@/assets/images/cartoons/Walkthrough.jpg')} style={styles.buttonImage} />
          <ThemedText type="defaultSemiBold">What can you do on Culture Tracker?</ThemedText>
        </View>
      </TouchableOpacity>

      <ThemedText type="defaultSemiBold" style={{marginTop: 30, marginBottom: 30}}>Quick actions to start taking notes of your experiments in seconds.</ThemedText>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/cell-line/new')}>
      <View style={styles.buttonContent}>
          <Image source={require('@/assets/images/cartoons/Cell Culture.jpg')} style={styles.buttonImage} />
          <ThemedText type="defaultSemiBold">Add new cell line</ThemedText>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/experiment/new')}>
        <View style={styles.buttonContent}>
          <Image source={require('@/assets/images/cartoons/Hood.jpg')} style={styles.buttonImage} />
          <ThemedText type="defaultSemiBold">Create new experiment</ThemedText>
        </View>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    resizeMode: 'contain',
  },
});

