import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable, Modal } from 'react-native';
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
  const [activeBrowseDevice, setActiveBrowseDevice] = useState<{ deviceCode: string; deviceName: string } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // Live backoff if permission is revoked while browsing
  useEffect(() => {
    if (activeBrowseDevice) {
      const device = devices.find(d => d.deviceCode === activeBrowseDevice.deviceCode);
      if (device && device.hasFileAccess === false) {
        setActiveBrowseDevice(null);
        Alert.alert('Permission Revoked', `${device.deviceName} has revoked your file access permission.`);
      }
    }
  }, [devices, activeBrowseDevice]);

  const handleSend = async (targetDeviceCode: string) => {
    setShowSendModal(false);
    setSending(true);
    try {
      await dropzone.sendFile(targetDeviceCode);
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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Files</Text>
          <Text style={styles.subtitle}>
            {tab === 'browse'
              ? activeBrowseDevice
                ? `Browsing ${activeBrowseDevice.deviceName}`
                : 'Select device to browse'
              : 'Send & receive files'}
          </Text>
        </View>
        {tab === 'transfers' && (
          <Button
            label={sending ? '...' : 'Send'}
            icon={
              <Ionicons name="cloud-upload-outline" size={18} color={colors.primaryForeground} />
            }
            style={{ paddingHorizontal: spacing.md }}
            onPress={() => {
              if (devices.length === 0) {
                Alert.alert('No paired device', 'Pair a device first to send files');
                return;
              }
              setShowSendModal(true);
            }}
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
          {!activeBrowseDevice ? (
            devices.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="link-outline" size={40} color={colors.mutedForeground} />
                <Text style={styles.emptyTitle}>No paired device</Text>
                <Text style={styles.emptyText}>Pair a device to browse its files</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {devices.map((d) => (
                  <Pressable
                    key={d.pairingId}
                    onPress={() => {
                      if (d.hasFileAccess !== false) {
                        setActiveBrowseDevice({ deviceCode: d.deviceCode, deviceName: d.deviceName });
                      }
                    }}
                  >
                    <Card style={[styles.item, d.hasFileAccess === false && { opacity: 0.7 }]}>
                      <View style={styles.row}>
                        <View style={styles.iconBox}>
                          <Ionicons
                            name={d.deviceType === 'desktop' ? 'desktop-outline' : 'phone-portrait-outline'}
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.name}>{d.deviceName}</Text>
                          <Text style={styles.deviceCode}>
                            {d.hasFileAccess === false ? 'No permission' : 'Browse files'}
                          </Text>
                        </View>
                        <Ionicons
                          name={d.hasFileAccess === false ? 'lock-closed-outline' : 'chevron-forward'}
                          size={20}
                          color={colors.mutedForeground}
                        />
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            )
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.browseHeader}>
                <Pressable onPress={() => setActiveBrowseDevice(null)} style={styles.backBtn} hitSlop={10}>
                  <Ionicons name="chevron-back" size={24} color={colors.foreground} />
                </Pressable>
              </View>
              <RemoteExplorer
                targetDevice={activeBrowseDevice.deviceCode}
                targetDeviceName={activeBrowseDevice.deviceName}
              />
            </View>
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
                    <Text style={styles.size}>
                      {formatSize(t.fileSize)}
                      {t.fromDevice ? ` • from ${devices.find(d => d.deviceCode === t.fromDevice)?.deviceName || t.fromDevice}` : ''}
                    </Text>
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

      {/* Send Device Selection Modal */}
      <Modal visible={showSendModal} transparent animationType="slide" onRequestClose={() => setShowSendModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSendModal(false)}>
          <View style={styles.actionSheet}>
            <Text style={styles.sheetTitle}>Send file to...</Text>
            <View style={styles.sheetDivider} />
            
            <ScrollView style={{ maxHeight: 300 }}>
              {devices.map((d) => (
                <Pressable
                  key={d.pairingId}
                  style={[styles.sheetItem, d.hasFileSend === false && { opacity: 0.5 }]}
                  onPress={() => {
                    if (d.hasFileSend !== false) {
                      handleSend(d.deviceCode);
                    }
                  }}
                >
                  <Ionicons
                    name={d.deviceType === 'desktop' ? 'desktop-outline' : 'phone-portrait-outline'}
                    size={22}
                    color={colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetText}>{d.deviceName}</Text>
                    {d.hasFileSend === false && (
                      <Text style={[styles.sheetText, { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 }]}>
                        No permission to receive files
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={d.hasFileSend === false ? 'lock-closed-outline' : 'cloud-upload-outline'}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              ))}
            </ScrollView>
            
            <Pressable style={[styles.sheetItem, { borderBottomWidth: 0, justifyContent: 'center', marginTop: 10 }]} onPress={() => setShowSendModal(false)}>
              <Text style={[styles.sheetText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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
  deviceCode: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  browseHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
  },
  backBtn: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 30,
    paddingTop: 10,
  },
  sheetTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 10,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '55',
  },
  sheetText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
});
