import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, radius } from '../theme';
import { useStore } from '../store';
import { dropzone } from '../services/dropzone';
import { loadDevices, syncPending } from '../hooks/useDropZone';
import { QRScanner } from '../components/QRScanner';
import { PermissionsSheet } from '../components/PermissionsSheet';
import { decodeQRData } from '../lib/qr';

const iconFor = (type: string) =>
  type === 'mobile'
    ? 'phone-portrait-outline'
    : type === 'web'
      ? 'globe-outline'
      : 'desktop-outline';

const fmt = (code: string) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);

export function DevicesScreen() {
  const { devices, deviceCode, deviceName, pendingRequests } = useStore();
  const [modal, setModal] = useState(false);
  const [pairMode, setPairMode] = useState<'scan' | 'code'>('scan');
  const [target, setTarget] = useState('');
  const [pairing, setPairing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [permFor, setPermFor] = useState<{ pairingId: string; name: string } | null>(null);

  const handleAccept = async (pairingId: string) => {
    setBusy(pairingId);
    try {
      await dropzone.acceptPairing(pairingId);
      await syncPending();
      if (deviceCode) await loadDevices(deviceCode);
      Alert.alert('Paired', 'Device connected successfully');
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (pairingId: string) => {
    setBusy(pairingId);
    try {
      await dropzone.rejectPairing(pairingId);
      await syncPending();
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    } finally {
      setBusy(null);
    }
  };

  const confirmUnpair = (pairingId: string, name: string) => {
    Alert.alert(
      'Unpair device',
      `Disconnect from ${name}? You'll need to pair again to reconnect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            setBusy(pairingId);
            try {
              await dropzone.unpairDevice(pairingId);
              if (deviceCode) await loadDevices(deviceCode);
            } catch (e: any) {
              Alert.alert('Failed', e.message);
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  };

  const closeModal = () => {
    setModal(false);
    setTarget('');
    setPairMode('scan');
  };

  const sendPairRequest = async (code: string) => {
    const clean = code.replace(/-/g, '').toUpperCase().trim();
    if (clean.length !== 8) {
      Alert.alert('Invalid code', 'Enter an 8-character device code');
      return;
    }
    setPairing(true);
    try {
      await dropzone.pairWithDevice(clean);
      Alert.alert('Request sent', 'Waiting for the other device to accept');
      closeModal();
      if (deviceCode) await loadDevices(deviceCode);
    } catch (e: any) {
      Alert.alert('Pairing failed', e.message);
    } finally {
      setPairing(false);
    }
  };

  const handleScanned = (data: string) => {
    const decoded = decodeQRData(data);
    if (!decoded) {
      Alert.alert('Invalid QR', 'That QR code is not a valid or current DropZone pairing code');
      return;
    }
    if (decoded.code === deviceCode) {
      Alert.alert('Cannot pair', "That's this device's own code");
      return;
    }
    sendPairRequest(decoded.code);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Devices</Text>
          <Text style={styles.subtitle}>{devices.length} paired</Text>
        </View>
        <Button
          label="Pair"
          icon={<Ionicons name="add" size={18} color={colors.primaryForeground} />}
          style={{ paddingHorizontal: spacing.md }}
          onPress={() => setModal(true)}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* This device */}
        <Card style={[styles.deviceCard, { borderColor: colors.primary + '4d' }]}>
          <View style={styles.iconBox}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{deviceName || 'This Phone'}</Text>
            <Text style={styles.deviceCode}>{deviceCode ? fmt(deviceCode) : '--------'}</Text>
          </View>
          <Badge label="This device" variant="success" />
        </Card>

        {/* Incoming pairing requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingLabel}>INCOMING REQUESTS</Text>
            {pendingRequests.map((req) => (
              <Card key={req.pairingId} style={[styles.deviceCard, styles.pendingCard]}>
                <View style={styles.iconBox}>
                  <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{req.fromDeviceName}</Text>
                  <Text style={styles.deviceCode}>wants to pair • {fmt(req.fromDeviceCode)}</Text>
                </View>
                <View style={styles.reqActions}>
                  <Pressable
                    style={[styles.reqBtn, { backgroundColor: colors.primary }]}
                    disabled={busy === req.pairingId}
                    onPress={() => handleAccept(req.pairingId)}
                  >
                    <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
                  </Pressable>
                  <Pressable
                    style={[styles.reqBtn, { borderWidth: 1, borderColor: colors.border }]}
                    disabled={busy === req.pairingId}
                    onPress={() => handleReject(req.pairingId)}
                  >
                    <Ionicons name="close" size={18} color={colors.foreground} />
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}

        {devices.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="link-outline" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No paired devices</Text>
            <Text style={styles.emptyText}>Tap Pair to connect your computer</Text>
          </View>
        ) : (
          devices.map((d) => (
            <Card key={d.pairingId} style={styles.deviceCard}>
              <View style={styles.iconWrap}>
                <View style={styles.iconBoxSecondary}>
                  <Ionicons
                    name={iconFor(d.deviceType) as any}
                    size={22}
                    color={colors.foreground}
                  />
                </View>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: d.online ? colors.success : colors.mutedForeground },
                  ]}
                />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{d.deviceName}</Text>
                <Text style={styles.deviceCode}>
                  {fmt(d.deviceCode)} • {d.online ? 'Online' : 'Offline'}
                </Text>
              </View>
              <View style={styles.deviceActions}>
                <Pressable
                  hitSlop={8}
                  onPress={() => setPermFor({ pairingId: d.pairingId, name: d.deviceName })}
                  style={styles.unpairBtn}
                >
                  <Ionicons name="options-outline" size={20} color={colors.mutedForeground} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  disabled={busy === d.pairingId}
                  onPress={() => confirmUnpair(d.pairingId, d.deviceName)}
                  style={styles.unpairBtn}
                >
                  <Ionicons name="unlink-outline" size={20} color={colors.destructive} />
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Pair modal */}
      <Modal visible={modal} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pair a Device</Text>

            {/* Mode toggle */}
            <View style={styles.toggle}>
              <Pressable
                style={[styles.toggleBtn, pairMode === 'scan' && styles.toggleActive]}
                onPress={() => setPairMode('scan')}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={16}
                  color={pairMode === 'scan' ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text style={[styles.toggleText, pairMode === 'scan' && styles.toggleTextActive]}>
                  Scan QR
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, pairMode === 'code' && styles.toggleActive]}
                onPress={() => setPairMode('code')}
              >
                <Ionicons
                  name="keypad-outline"
                  size={16}
                  color={pairMode === 'code' ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text style={[styles.toggleText, pairMode === 'code' && styles.toggleTextActive]}>
                  Enter Code
                </Text>
              </Pressable>
            </View>

            {pairMode === 'scan' ? (
              <>
                <Text style={styles.modalSubtitle}>Scan the QR code shown on the other device</Text>
                <QRScanner onScanned={handleScanned} />
                <Button label="Cancel" variant="outline" onPress={closeModal} />
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Enter the other device's code</Text>
                <TextInput
                  value={target}
                  onChangeText={setTarget}
                  placeholder="XXXX-XXXX"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  maxLength={9}
                  style={styles.input}
                />
                <View style={styles.modalActions}>
                  <Button
                    label="Cancel"
                    variant="outline"
                    style={{ flex: 1 }}
                    onPress={closeModal}
                  />
                  <Button
                    label={pairing ? '...' : 'Pair'}
                    style={{ flex: 1 }}
                    onPress={() => sendPairRequest(target)}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <PermissionsSheet
        visible={!!permFor}
        onClose={() => setPermFor(null)}
        pairingId={permFor?.pairingId ?? null}
        deviceName={permFor?.name ?? 'this device'}
      />
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
  deviceActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  pendingSection: { gap: spacing.sm },
  pendingLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  pendingCard: { borderColor: colors.primary + '66', backgroundColor: colors.primary + '0d' },
  reqActions: { flexDirection: 'row', gap: spacing.sm },
  reqBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unpairBtn: { padding: spacing.xs },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  emptyText: { fontSize: fontSize.sm, color: colors.mutedForeground },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  modalSubtitle: { fontSize: fontSize.sm, color: colors.mutedForeground },
  toggle: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: fontSize.sm, color: colors.mutedForeground, fontWeight: '500' },
  toggleTextActive: { color: colors.primaryForeground },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    color: colors.foreground,
    fontSize: fontSize.lg,
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
