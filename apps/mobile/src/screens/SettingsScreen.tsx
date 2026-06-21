import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, radius } from '../theme';
import { useStore } from '../store';
import { reconnectDropZone } from '../hooks/useDropZone';
import { dropzone } from '../services/dropzone';
import * as storage from '../services/storage';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../theme/ThemeContext';
import * as FileSystem from 'expo-file-system/legacy';

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
  const { theme, toggleTheme } = useTheme();
  const [reconnecting, setReconnecting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(deviceName || '');
  const [sharedFolders, setSharedFolders] = useState<string[]>([]);

  React.useEffect(() => {
    const loadFolders = async () => {
      try {
        let urisStr = await SecureStore.getItemAsync('sharedDirectoryUris');
        let uris: string[] = urisStr ? JSON.parse(urisStr) : [];

        // Migrate legacy single folder if needed
        const legacyUri = await SecureStore.getItemAsync('savedDirectoryUri');
        if (legacyUri && !uris.includes(legacyUri)) {
          uris.push(legacyUri);
          await SecureStore.setItemAsync('sharedDirectoryUris', JSON.stringify(uris));
          // Keep savedDirectoryUri intact for fileTransfer.ts compatibility
        }
        setSharedFolders(uris);
      } catch (e) {
        console.error('Failed to load shared folders', e);
      }
    };
    loadFolders();
  }, []);

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

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const { api } = dropzone;
      const res = await api.updateMe({ deviceName: trimmed });
      if (res.success) {
        useStore.getState().setDevice(deviceCode!, trimmed);
        // Update stored credentials
        const creds = await storage.loadCredentials();
        if (creds) {
          creds.deviceName = trimmed;
          await storage.saveCredentials(creds);
        }
        setRenaming(false);
        Alert.alert('Renamed', `Device name updated to "${trimmed}"`);
      } else {
        Alert.alert('Failed', res.error || 'Could not rename');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Device',
      'This will delete all credentials and pairings. You will need to re-pair with all devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored data
              await SecureStore.deleteItemAsync('dropzone_credentials');
              await SecureStore.deleteItemAsync('dropzone_secrets');
            } catch {
              // Might fail if using memory fallback — that's fine
            }
            // Disconnect and reload (Expo reload)
            dropzone.disconnect();
            const { Updates } = require('expo');
            try {
              await Updates.reloadAsync();
            } catch {
              // If Updates not available (dev), just reinitialize
              Alert.alert('Reset complete', 'Please restart the app');
            }
          },
        },
      ]
    );
  };

  const handleSelectFolder = async () => {
    try {
      if (!FileSystem.StorageAccessFramework) {
        Alert.alert('Not Supported', 'Storage Access Framework is not supported on this device.');
        return;
      }
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const uris = [...sharedFolders, permissions.directoryUri];
        // Deduplicate
        const uniqueUris = Array.from(new Set(uris));

        await SecureStore.setItemAsync('sharedDirectoryUris', JSON.stringify(uniqueUris));
        // Keep the first one as default download location for file transfers
        if (uniqueUris.length === 1) {
          await SecureStore.setItemAsync('savedDirectoryUri', permissions.directoryUri);
        }
        setSharedFolders(uniqueUris);
        Alert.alert('Success', 'Folder linked successfully. Desktop can now browse this folder.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRemoveFolder = async (uriToRemove: string) => {
    const updated = sharedFolders.filter((uri) => uri !== uriToRemove);
    await SecureStore.setItemAsync('sharedDirectoryUris', JSON.stringify(updated));
    setSharedFolders(updated);
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

        {/* Device with rename */}
        <Section icon="person-outline" title="Device">
          {renaming ? (
            <View style={styles.renameRow}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                style={styles.renameInput}
                autoFocus
                placeholder="Device name"
                placeholderTextColor={colors.mutedForeground}
                onSubmitEditing={handleRename}
              />
              <Button
                label="Save"
                style={{ paddingHorizontal: spacing.md }}
                onPress={handleRename}
              />
              <Pressable onPress={() => setRenaming(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Name</Text>
              <Pressable
                style={styles.nameBtn}
                onPress={() => {
                  setNewName(deviceName || '');
                  setRenaming(true);
                }}
              >
                <Text style={styles.rowValue}>{deviceName || 'Not set'}</Text>
                <Ionicons name="pencil-outline" size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}
          <Row label="Code" value={fmt(deviceCode)} />
          <Row
            label="Status"
            value={connected ? 'Online' : 'Offline'}
            valueColor={connected ? colors.success : colors.mutedForeground}
          />
        </Section>

        <Section icon="color-palette-outline" title="Appearance">
          <View style={styles.connRow}>
            <Text style={styles.rowValue}>
              {theme === 'dark' ? '🌙 Dark mode' : '☀️ Light mode'}
            </Text>
            <Button
              label={theme === 'dark' ? 'Light' : 'Dark'}
              variant="outline"
              style={{ paddingHorizontal: spacing.md }}
              onPress={toggleTheme}
            />
          </View>
        </Section>

        <Section icon="shield-checkmark-outline" title="Privacy & Security">
          <Row label="Encryption" value="NaCl secretbox" valueColor={colors.success} />
          <Row label="Key Exchange" value="X25519" />
          <Row label="Zero-knowledge" value="Active" valueColor={colors.success} />
        </Section>

        {/* Shared Storage */}
        <Section icon="folder-outline" title="Shared Storage">
          <Text style={styles.hint}>
            Select folders on your device to share with your paired desktop computers.
          </Text>

          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            {sharedFolders.map((uri) => {
              let label = 'Shared Folder';
              try {
                const decoded = decodeURIComponent(uri);
                const parts = decoded.split('/');
                const lastPart = parts[parts.length - 1];
                if (lastPart.includes(':')) {
                  label = lastPart.split(':')[1] || lastPart;
                } else {
                  label = lastPart;
                }
              } catch (e) {}

              return (
                <View key={uri} style={styles.connRow}>
                  <View style={styles.connStatus}>
                    <View style={[styles.dot, { backgroundColor: colors.success }]} />
                    <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="middle">
                      {label}
                    </Text>
                  </View>
                  <Button
                    label="Remove"
                    variant="outline"
                    style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}
                    onPress={() => handleRemoveFolder(uri)}
                  />
                </View>
              );
            })}
          </View>

          <Button
            label="Add Folder"
            icon={<Ionicons name="add" size={16} color={colors.primaryForeground} />}
            onPress={handleSelectFolder}
            style={{ marginTop: spacing.sm }}
          />
        </Section>

        <Section icon="information-circle-outline" title="About">
          <Row label="Version" value="0.1.0" />
          <Row label="Platform" value="Mobile (Expo)" />
        </Section>

        {/* Danger Zone */}
        <Card style={[styles.section, styles.dangerCard]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={16} color={colors.destructive} />
            <Text style={[styles.sectionTitle, { color: colors.destructive }]}>Danger Zone</Text>
          </View>
          <Text style={styles.hint}>
            Reset this device identity. You will lose all pairings and need to re-pair.
          </Text>
          <Button label="Reset Device" variant="outline" onPress={handleReset} />
        </Card>
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
  nameBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  renameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  dangerCard: { borderColor: colors.destructive + '4d' },
});
