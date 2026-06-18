import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSize } from '../theme';

type BadgeVariant = 'default' | 'success' | 'secondary' | 'outline';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const variantStyle = {
    default: { bg: colors.primary, fg: colors.primaryForeground, border: 'transparent' },
    success: { bg: 'rgba(34,197,94,0.2)', fg: colors.success, border: 'transparent' },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.foreground, border: colors.border },
  }[variant];

  return (
    <View
      style={[styles.badge, { backgroundColor: variantStyle.bg, borderColor: variantStyle.border }]}
    >
      <Text style={[styles.text, { color: variantStyle.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
