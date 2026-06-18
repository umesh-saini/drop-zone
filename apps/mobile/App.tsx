import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { ClipboardScreen } from './src/screens/ClipboardScreen';
import { FilesScreen } from './src/screens/FilesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors, spacing, fontSize } from './src/theme';

type Tab = 'devices' | 'clipboard' | 'files' | 'settings';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'devices', label: 'Devices', icon: 'phone-portrait-outline' },
  { id: 'clipboard', label: 'Clipboard', icon: 'clipboard-outline' },
  { id: 'files', label: 'Files', icon: 'folder-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('devices');

  const renderScreen = () => {
    switch (tab) {
      case 'devices':
        return <DevicesScreen />;
      case 'clipboard':
        return <ClipboardScreen />;
      case 'files':
        return <FilesScreen />;
      case 'settings':
        return <SettingsScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* Top brand bar */}
      <View style={styles.brandBar}>
        <View style={styles.brandLeft}>
          <View style={styles.logo}>
            <Ionicons name="flash" size={18} color={colors.primary} />
          </View>
          <Text style={styles.brandName}>DropZone</Text>
        </View>
        <View style={styles.connBadge}>
          <View style={styles.connDot} />
          <Text style={styles.connText}>Connected</Text>
        </View>
      </View>

      {/* Active screen */}
      <View style={styles.screen}>{renderScreen()}</View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} style={styles.tab} onPress={() => setTab(t.id)}>
              <Ionicons
                name={t.icon}
                size={22}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  brandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary + '1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  connBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  connDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  connText: { fontSize: fontSize.sm, color: colors.success },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: fontSize.xs, fontWeight: '500' },
});
