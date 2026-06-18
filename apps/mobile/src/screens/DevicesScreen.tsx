import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, radius } from '../theme';

const devices = [
  { id: '1', name: 'My Laptop', type: 'laptop', code: '9892-WXHG', online: true, mode: 'local' },
  { id: '2', name: 'Work PC', type: 'desktop', code: 'A3K9-M2X7', online: true, mode: 'remote' },
  { id: '3', name: 'iPad', type: 'tablet', code: 'K3M9-2X7P', online: false, mode: 'remote' },
];

const iconFor = (type: string) =>
  type === 'laptop'
    ? 'laptop-outline'
    : type === 'tablet'
      ? 'tablet-portrait-outline'
      : 'desktop-outline';

export function DevicesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Devices</Text>
          <Text style={styles.subtitle}>{devices.length} paired devices</Text>
        </View>
        <Button
          label="Pair"
          icon={<Ionicons name="add" size={18} color={colors.primaryForeground} />}
          style={{ paddingHorizontal: spacing.md }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* This device */}
        <Card style={[styles.deviceCard, { borderColor: colors.primary + '4d' }]}>
          <View style={styles.iconBox}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>This Phone</Text>
            <Text style={styles.deviceCode}>BDYE-E9BL</Text>
          </View>
          <Badge label="This device" variant="success" />
        </Card>

        {devices.map((d) => (
          <Card key={d.id} style={styles.deviceCard}>
            <View style={styles.iconWrap}>
              <View style={styles.iconBoxSecondary}>
                <Ionicons name={iconFor(d.type) as any} size={22} color={colors.foreground} />
              </View>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: d.online ? colors.success : colors.mutedForeground },
                ]}
              />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{d.name}</Text>
              <Text style={styles.deviceCode}>
                {d.code} • {d.online ? 'Online' : 'Offline'}
              </Text>
            </View>
            {d.online && <Badge label={d.mode === 'local' ? 'LAN' : 'Remote'} variant="outline" />}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  deviceCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  iconWrap: { position: 'relative' },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxSecondary: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.card,
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  deviceCode: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});
