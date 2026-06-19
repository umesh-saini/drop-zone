import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Switch, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../theme';
import { dropzone } from '../services/dropzone';

const GROUPS = [
  {
    key: 'clipboard',
    label: 'Clipboard Sync',
    description: 'Share copied text between devices',
    icon: 'clipboard-outline',
    types: ['clipboard_read', 'clipboard_write'],
  },
  {
    key: 'files',
    label: 'File Sharing',
    description: 'Send and receive files',
    icon: 'swap-vertical-outline',
    types: ['file_send', 'file_receive'],
  },
  {
    key: 'browse',
    label: 'Remote File Browsing',
    description: 'Let this device browse your shared files',
    icon: 'folder-outline',
    types: ['file_access_read'],
  },
  {
    key: 'edit',
    label: 'Remote File Editing',
    description: 'Let this device edit or delete your files',
    icon: 'create-outline',
    types: ['file_access_write'],
  },
] as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  pairingId: string | null;
  deviceName: string;
}

export function PermissionsSheet({ visible, onClose, pairingId, deviceName }: Props) {
  const [loading, setLoading] = useState(true);
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !pairingId) return;
    setLoading(true);
    dropzone.refreshPermissions(pairingId).then(() => {
      setGranted(dropzone.getPermissions(pairingId));
      setLoading(false);
    });
  }, [visible, pairingId]);

  const isOn = (types: readonly string[]) => types.every((t) => granted[t]);

  const toggle = async (group: (typeof GROUPS)[number]) => {
    if (!pairingId) return;
    const newValue = !isOn(group.types);
    setSaving(group.key);
    try {
      for (const type of group.types) {
        await dropzone.setPermission(pairingId, type, newValue);
      }
      setGranted(dropzone.getPermissions(pairingId));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Permissions</Text>
              <Text style={styles.subtitle}>What {deviceName} can do</Text>
            </View>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
          ) : (
            GROUPS.map((g) => (
              <View key={g.key} style={styles.row}>
                <View style={styles.iconBox}>
                  <Ionicons name={g.icon as any} size={20} color={colors.foreground} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>{g.label}</Text>
                  <Text style={styles.desc}>{g.description}</Text>
                </View>
                {saving === g.key ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Switch
                    value={isOn(g.types)}
                    onValueChange={() => toggle(g)}
                    trackColor={{ false: colors.secondary, true: colors.primary }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            ))
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: fontSize.sm, color: colors.mutedForeground },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  label: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  desc: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
});
