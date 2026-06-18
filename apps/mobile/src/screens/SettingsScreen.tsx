import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { colors, spacing, fontSize } from '../theme';

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={colors.foreground} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Section icon="person-outline" title="Device">
          <Row label="Name" value="This Phone" />
          <Row label="Code" value="BDYE-E9BL" />
          <Row label="Connection" value="Local" />
        </Section>

        <Section icon="shield-checkmark-outline" title="Privacy & Security">
          <Row label="Encryption" value="AES-256-GCM" valueColor={colors.success} />
          <Row label="Key Exchange" value="X25519" />
          <Row label="Zero-knowledge" value="Active" valueColor={colors.success} />
        </Section>

        <Section icon="wifi-outline" title="Network">
          <Row label="Local Mode" value="Enabled" valueColor={colors.success} />
          <Row label="Prefer Local" value="On" />
        </Section>

        <Section icon="information-circle-outline" title="About">
          <Row label="Version" value="0.1.0" />
          <Row label="Platform" value="Mobile (Expo)" />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.foreground },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  sectionBody: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: fontSize.sm, color: colors.mutedForeground },
  rowValue: { fontSize: fontSize.sm, color: colors.foreground, fontWeight: '500' },
});
