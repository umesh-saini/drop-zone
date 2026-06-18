import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, radius } from '../theme';
import { useStore } from '../store';
import { reconnectDropZone } from '../hooks/useDropZone';

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

const fmt = (code: string | null) =>
  code && code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : '--------';

export function SettingsScreen() {
  const { deviceCode, deviceName, connected } = useStore();
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await reconnectDropZone();
      Alert.alert('Connected', 'Reconnected to server successfully');
    } catch (e: any) {
      Alert.alert('Reconnect failed', e.message);
    } finally {
      setReconnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Connection */}
        <Section icon="link-outline" title="Connection">
          <View style={styles.connRow}>
            <View style={styles.connStatus}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: connected ? colors.success : colors.mutedForeground },
                ]}
              />
              <Text style={styles.rowValue}>{connected ? 'Connected' : 'Disconnected'}</Text>
            </View>
            <Button
              label={reconnecting ? '...' : 'Reconnect'}
              icon={<Ionicons name="refresh" size={16} color={colors.primaryForeground} />}
              style={{ paddingHorizontal: spacing.md }}
              onPress={handleReconnect}
            />
          </View>
          <Text style={styles.hint}>
            Connects automatically. Tap Reconnect if you go offline or the server was reset.
          </Text>
        </Section>

        <Section icon="person-outline" title="Device">
          <Row label="Name" value={deviceName || 'Not set'} />
          <Row label="Code" value={fmt(deviceCode)} />
          <Row
            label="Status"
            value={connected ? 'Online' : 'Offline'}
            valueColor={connected ? colors.success : colors.mutedForeground}
          />
        </Section>

        <Section icon="shield-checkmark-outline" title="Privacy & Security">
          <Row label="Encryption" value="NaCl secretbox" valueColor={colors.success} />
          <Row label="Key Exchange" value="X25519" />
          <Row label="Zero-knowledge" value="Active" valueColor={colors.success} />
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
  connRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  connStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  hint: { fontSize: fontSize.xs, color: colors.mutedForeground },
});
