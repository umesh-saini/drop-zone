import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, radius } from '../theme';
import { useStore } from '../store';
import { dropzone } from '../services/dropzone';
import { RemoteExplorer } from '../components/explorer/RemoteExplorer';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export function FilesScreen() {
  const { transfers, devices } = useStore();
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'transfers' | 'browse'>('transfers');

  const handleSend = async () => {
    const online = devices.filter((d) => d.online);
    const target = online[0] || devices[0];
    if (!target) {
      Alert.alert('No paired device', 'Pair a device first to send files');
      return;
    }
    setSending(true);
    try {
      await dropzone.sendFile(target.deviceCode);
    } catch (e: any) {
      Alert.alert('Send failed', e.message);
    } finally {
      setSending(false);
    }
  };

  const browseTarget = devices.find((d) => d.online) || devices[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Files</Text>
          <Text style={styles.subtitle}>
            {tab === 'browse'
              ? browseTarget
                ? `Browsing ${browseTarget.deviceName}`
                : 'Send, receive & browse'
              : 'Send, receive & browse'}
          </Text>
        </View>
        {tab === 'transfers' && (
          <Button
            label={sending ? '...' : 'Send'}
            icon={
              <Ionicons name="cloud-upload-outline" size={18} color={colors.primaryForeground} />
            }
            style={{ paddingHorizontal: spacing.md }}
            onPress={handleSend}
          />
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, tab === 'transfers' && styles.tabActive]}
          onPress={() => setTab('transfers')}
        >
          <Text style={[styles.tabText, tab === 'transfers' && styles.tabTextActive]}>
            Transfers
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'browse' && styles.tabActive]}
          onPress={() => setTab('browse')}
        >
          <Ionicons
            name="folder-open-outline"
            size={14}
            color={tab === 'browse' ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text style={[styles.tabText, tab === 'browse' && styles.tabTextActive]}>
            Browse Device
          </Text>
        </Pressable>
      </View>

      {/* Browse tab */}
      {tab === 'browse' && (
        <View style={{ flex: 1 }}>
          {!browseTarget ? (
            <View style={styles.empty}>
              <Ionicons name="link-outline" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No paired device</Text>
              <Text style={styles.emptyText}>Pair a device to browse its files</Text>
            </View>
          ) : (
            <RemoteExplorer
              targetDevice={browseTarget.deviceCode}
              targetDeviceName={browseTarget.deviceName}
            />
          )}
        </View>
      )}

      {/* Transfers tab */}
      {tab === 'transfers' && (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {transfers.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No transfers yet</Text>
              <Text style={styles.emptyText}>Tap Send to share a file with a paired device</Text>
            </View>
          ) : (
            transfers.map((t) => (
              <Card key={t.fileId} style={styles.item}>
                <View style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name={t.direction === 'send' ? 'arrow-up' : 'arrow-down'}
                      size={18}
                      color={t.direction === 'send' ? colors.primary : colors.success}
                    />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {t.fileName}
                    </Text>
                    <Text style={styles.size}>{formatSize(t.fileSize)}</Text>
                  </View>
                  <Badge
                    label={t.status === 'in_progress' ? `${t.progress}%` : t.status}
                    variant={
                      t.status === 'completed'
                        ? 'success'
                        : t.status === 'failed'
                          ? 'secondary'
                          : 'secondary'
                    }
                  />
                </View>
                {t.status === 'in_progress' && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${t.progress}%` }]} />
                  </View>
                )}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.mutedForeground },
  tabTextActive: { color: colors.primaryForeground },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
  item: { padding: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  size: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  emptyText: { fontSize: fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
