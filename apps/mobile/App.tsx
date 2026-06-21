import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { ClipboardScreen } from './src/screens/ClipboardScreen';
import { FilesScreen } from './src/screens/FilesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { useThemeStore } from './src/theme/ThemeContext';
import { colors, spacing, fontSize } from './src/theme';
import { useDropZone } from './src/hooks/useDropZone';
import { useStore } from './src/store';
import { GlobalTransferToast } from './src/components/GlobalTransferToast';

type Tab = 'devices' | 'clipboard' | 'files' | 'settings';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'devices', label: 'Devices', icon: 'phone-portrait-outline' },
  { id: 'clipboard', label: 'Clipboard', icon: 'clipboard-outline' },
  { id: 'files', label: 'Files', icon: 'folder-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

function AppContent() {
  const [tab, setTab] = useState<Tab>('devices');
  const { initializing, connected } = useStore();
  const themeColors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  useDropZone();

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

  if (initializing) {
    return (
      <View
        style={[
          styles.root,
          styles.center,
          { paddingTop: insets.top, backgroundColor: themeColors.background },
        ]}
      >
        <StatusBar style={useThemeStore.getState().theme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.mutedForeground }]}>
          Connecting to DropZone…
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { paddingTop: insets.top, backgroundColor: themeColors.background }]}
    >
      <StatusBar style={useThemeStore.getState().theme === 'dark' ? 'light' : 'dark'} />

      {/* Top brand bar */}
      <View style={[styles.brandBar, { borderBottomColor: themeColors.border }]}>
        <View style={styles.brandLeft}>
          <View style={[styles.logo, { backgroundColor: themeColors.primary + '1a' }]}>
            <Ionicons name="flash" size={18} color={themeColors.primary} />
          </View>
          <Text style={[styles.brandName, { color: themeColors.foreground }]}>DropZone</Text>
        </View>
        <View style={styles.connBadge}>
          <View
            style={[
              styles.connDot,
              { backgroundColor: connected ? colors.success : colors.mutedForeground },
            ]}
          />
          <Text
            style={[
              styles.connText,
              { color: connected ? colors.success : colors.mutedForeground },
            ]}
          >
            {connected ? 'Connected' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Global Transfer Toast */}
      <GlobalTransferToast />

      {/* Active screen */}
      <View style={styles.screen}>{renderScreen()}</View>

      {/* Bottom tab bar — padded for the system navigation bar */}
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            backgroundColor: themeColors.card,
            borderTopColor: themeColors.border,
          },
        ]}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} style={styles.tab} onPress={() => setTab(t.id)}>
              <Ionicons
                name={t.icon}
                size={22}
                color={active ? themeColors.primary : themeColors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? themeColors.primary : themeColors.mutedForeground },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    // Load theme
    useThemeStore.getState().loadTheme();
    // Check onboarding
    SecureStore.getItemAsync('dropzone_onboarded')
      .then((v) => setOnboarded(v === 'true'))
      .catch(() => setOnboarded(true));
  }, []);

  if (onboarded === null) return null;

  if (!onboarded) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen
          onComplete={(name) => {
            SecureStore.setItemAsync('dropzone_onboarded', 'true').catch(() => {});
            SecureStore.setItemAsync('dropzone_device_name', name).catch(() => {});
            setOnboarded(true);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: { justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { color: colors.mutedForeground, fontSize: fontSize.sm },
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
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: fontSize.xs, fontWeight: '500' },
});
