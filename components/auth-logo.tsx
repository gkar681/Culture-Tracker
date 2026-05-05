import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const source = require('@/assets/images/CultureTrackerLogo.png');

export function AuthLogo() {
  return (
    <View style={styles.wrap}>
      <Image
        source={source}
        style={styles.image}
        contentFit="contain"
        accessibilityLabel="CultureTracker logo"
        accessibilityRole="image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    marginBottom: -10,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 30,
  },
});
