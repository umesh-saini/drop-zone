import React from 'react';
import { Pressable, Text, StyleSheet, PressableProps, View } from 'react-native';
import { colors, radius, spacing, fontSize } from '../theme';

type ButtonVariant = 'default' | 'secondary' | 'outline';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
}

export function Button({ label, variant = 'default', icon, style, ...props }: ButtonProps) {
  const variantStyle = {
    default: { bg: colors.primary, fg: colors.primaryForeground, border: 'transparent' },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.foreground, border: colors.border },
  }[variant];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
          opacity: pressed ? 0.85 : 1,
        },
        style as object,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {icon}
        <Text style={[styles.label, { color: variantStyle.fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
