import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, radius } from '../theme';

interface Props {
  onComplete: (deviceName: string) => void;
}

const steps = [
  {
    icon: 'flash-outline' as const,
    title: 'Welcome to DropZone',
    desc: 'Bridge your phone and computer — clipboard sync, file sharing, and remote access.',
  },
  {
    icon: 'clipboard-outline' as const,
    title: 'Clipboard Sync',
    desc: 'Copy on one device, paste on another. Automatic and encrypted.',
  },
  {
    icon: 'swap-vertical-outline' as const,
    title: 'File Sharing',
    desc: 'Send files between devices with live progress. Fast and secure.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Privacy First',
    desc: 'End-to-end encrypted. The server never sees your data.',
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  const isNameStep = step === steps.length;

  if (isNameStep) {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="phone-portrait-outline" size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>Name your device</Text>
        <Text style={styles.desc}>
          Give this phone a name so you can recognize it on other devices.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. My Phone"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          onSubmitEditing={() =>
            onComplete(name.trim() || `Phone ${Math.floor(Math.random() * 1000)}`)
          }
        />
        <Button
          label="Get Started"
          icon={<Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />}
          onPress={() => onComplete(name.trim() || `Phone ${Math.floor(Math.random() * 1000)}`)}
        />
      </View>
    );
  }

  const s = steps[step];

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={s.icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.desc}>{s.desc}</Text>

      {/* Dots */}
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <Button
        label={step < steps.length - 1 ? 'Next' : 'Set Up Device'}
        icon={<Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />}
        onPress={() => setStep(step + 1)}
      />
      {step > 0 && (
        <Pressable onPress={() => setStep(step - 1)}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primary + '1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  desc: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  dotActive: { backgroundColor: colors.primary },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.foreground,
    textAlign: 'center',
  },
  back: { fontSize: fontSize.sm, color: colors.mutedForeground },
});
