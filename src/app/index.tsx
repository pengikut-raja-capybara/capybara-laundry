import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandWordmark } from '../components/BrandWordmark';
import { Button } from '../components/ui';
import { colors, radius, shadows, spacing } from '../theme/tokens';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.center}>
        <View style={styles.heroOuterRing}>
          <View style={styles.heroTile}>
            <Image
              source={require('../../assets/images/capybara-hero.jpg')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <BrandWordmark size="xl" />
      </View>

      <Button label="Mulai" onPress={() => router.push('/login')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
  },
  bgOrbTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#E1ECFE',
    top: -110,
    right: -80,
    opacity: 0.7,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#E8F1FF',
    bottom: 80,
    left: -90,
    opacity: 0.65,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  heroOuterRing: {
    padding: 8,
    borderRadius: radius.xxl * 2 + 8,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    ...shadows.elevated,
  },
  heroTile: {
    width: 240,
    height: 240,
    borderRadius: radius.xxl * 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 240,
    height: 240,
  },
});
