import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens';

interface BrandWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  inverted?: boolean;
}

const SIZE_MAP = {
  sm: 22,
  md: 28,
  lg: 36,
  xl: 44,
} as const;

/**
 * Stylized "CaNdry" wordmark using Fredoka Bold rounded display typography
 * with a highlighted royal-blue "N".
 */
export function BrandWordmark({ size = 'lg', inverted = false }: BrandWordmarkProps) {
  const fontSize = SIZE_MAP[size];
  const baseColor = inverted ? '#FFFFFF' : colors.textPrimary;
  const accentColor = inverted ? '#93C5FD' : colors.primary;

  return (
    <View style={styles.row}>
      <Text style={[styles.word, { fontSize, color: baseColor }]}>Ca</Text>
      <Text style={[styles.word, { fontSize, color: accentColor }]}>N</Text>
      <Text style={[styles.word, { fontSize, color: baseColor }]}>dry</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  word: {
    fontFamily: fonts.brand,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
