import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Card } from '../components/Card';
import { colors, spacing, fontSize, radius } from '../theme';
import { useStore } from '../store';
import { dropzone } from '../services/dropzone';
import { terminalHtml } from '../terminalHtml';

export function TerminalScreen() {
  const { devices, deviceCode } = useStore();
  const [activeDevice, setActiveDevice] = useState<{
    pairingId: string;
    deviceCode: string;
    name: string;
  } | null>(null);

  // Use a ref for isReady so the PTY data handler always sees the current value
  // without triggering a useEffect re-run (which would restart the session).
  const isReadyRef = useRef(false);
  const dataBuffer = useRef<string>('');
  const webViewRef = useRef<WebView>(null);

  // Filter only desktop devices
  const desktopDevices = devices.filter((d) => d.deviceType === 'desktop');

  const writeToTerm = useCallback((data: string) => {
    const escapedData = btoa(unescape(encodeURIComponent(data)));
    webViewRef.current?.injectJavaScript(`
      if (window.term) {
        window.term.write(decodeURIComponent(escape(atob('${escapedData}'))));
      }
      true;
    `);
  }, []);

  // Handle incoming PTY data → WebView. Only depends on activeDevice/deviceCode,
  // NOT on isReady, so the session is never restarted when the WebView becomes ready.
  useEffect(() => {
    if (!activeDevice || !deviceCode) return;

    // Reset ready state for each new device session
    isReadyRef.current = false;
    dataBuffer.current = '';

    dropzone.startTerminalSession(activeDevice.deviceCode, activeDevice.pairingId);

    const handleData = (fromDevice: string, data: string) => {
      if (fromDevice !== activeDevice.deviceCode) return;

      if (!isReadyRef.current) {
        // Buffer data until the WebView xterm instance is ready
        dataBuffer.current += data;
        return;
      }
      writeToTerm(data);
    };

    dropzone.callbacks.onPtyDataReceived = handleData;

    return () => {
      dropzone.callbacks.onPtyDataReceived = undefined;
      dropzone.closeTerminalSession(activeDevice.deviceCode);
      isReadyRef.current = false;
      dataBuffer.current = '';
    };
  }, [activeDevice, deviceCode, writeToTerm]);

  // Handle messages coming from the WebView (user typing / ready signal)
  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);

        if (msg.type === 'ready') {
          isReadyRef.current = true;

          // Flush any data that arrived before the WebView was ready
          if (dataBuffer.current.length > 0) {
            writeToTerm(dataBuffer.current);
            dataBuffer.current = '';
          }
        } else if (msg.type === 'data' && activeDevice?.deviceCode) {
          dropzone.sendTerminalData(activeDevice.deviceCode, msg.data);
        } else if (msg.type === 'resize' && activeDevice?.deviceCode) {
          dropzone.resizeTerminalSession(activeDevice.deviceCode, msg.cols, msg.rows);
        }
      } catch (e) {
        // ignore malformed messages
      }
    },
    [activeDevice, writeToTerm]
  );

  // Live backoff if permission is revoked while in a session
  useEffect(() => {
    if (activeDevice) {
      const device = devices.find(d => d.deviceCode === activeDevice.deviceCode);
      if (device && device.hasTerminalAccess === false) {
        isReadyRef.current = false;
        dataBuffer.current = '';
        setActiveDevice(null);
        Alert.alert('Permission Revoked', `${device.deviceName} has revoked your terminal access permission.`);
      }
    }
  }, [devices, activeDevice]);

  if (activeDevice) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              isReadyRef.current = false;
              dataBuffer.current = '';
              setActiveDevice(null);
            }}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Ionicons name="terminal-outline" size={18} color={colors.foreground} />
            <Text style={styles.title}>{activeDevice.name}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <WebView
          ref={webViewRef}
          source={{ html: terminalHtml }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={styles.webview}
          onMessage={onMessage}
          bounces={false}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          hideKeyboardAccessoryView={true}
          keyboardDisplayRequiresUserAction={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Terminal</Text>
          <Text style={styles.subtitle}>Select a desktop device to connect</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {desktopDevices.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="desktop-outline" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No Desktops Available</Text>
            <Text style={styles.emptyText}>Pair a desktop device to access its terminal</Text>
          </View>
        ) : (
          desktopDevices.map((d) => (
            <Pressable
              key={d.pairingId}
              onPress={() => {
                if (d.hasTerminalAccess !== false) {
                  setActiveDevice({
                    pairingId: d.pairingId,
                    deviceCode: d.deviceCode,
                    name: d.deviceName,
                  });
                }
              }}
            >
              <Card style={[styles.deviceCard, d.hasTerminalAccess === false && { opacity: 0.7 }]}>
                <View style={styles.iconWrap}>
                  <View style={styles.iconBox}>
                    <Ionicons name="desktop-outline" size={22} color={colors.foreground} />
                  </View>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: d.online ? colors.success : colors.warning },
                    ]}
                  />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{d.deviceName}</Text>
                  <Text style={styles.deviceCode}>
                    {d.hasTerminalAccess === false ? 'No permission' : 'Connect to shell'}
                  </Text>
                </View>
                <Ionicons
                  name={d.hasTerminalAccess === false ? 'lock-closed-outline' : 'chevron-forward'}
                  size={20}
                  color={colors.mutedForeground}
                />
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
  deviceCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  iconWrap: { position: 'relative' },
  iconBox: {
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
    color: colors.primary,
    marginTop: 2,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  emptyText: { fontSize: fontSize.sm, color: colors.mutedForeground },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
