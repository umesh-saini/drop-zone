import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { colors, spacing, fontSize, radius } from '../theme';
import { useStore } from '../store';
import { dropzone } from '../services/dropzone';

export function TerminalScreen() {
  const { devices, deviceCode } = useStore();
  const [activeDevice, setActiveDevice] = useState<{ pairingId: string; deviceCode: string; name: string } | null>(null);
  const webViewRef = useRef<WebView>(null);
  
  // Filter only desktop devices (ignoring online status as per user request due to bug)
  const desktopDevices = devices.filter((d) => d.deviceType === 'desktop');

  // Handle incoming data from PTY socket to send to WebView
  useEffect(() => {
    if (!activeDevice || !deviceCode) return;

    dropzone.startTerminalSession(activeDevice.deviceCode, activeDevice.pairingId);

    const handleData = (fromDevice: string, data: string) => {
      if (fromDevice === activeDevice.deviceCode) {
        // Send data to WebView xterm instance
        const escapedData = btoa(unescape(encodeURIComponent(data)));
        webViewRef.current?.injectJavaScript(`
          if (window.term) {
            window.term.write(decodeURIComponent(escape(atob('${escapedData}'))));
          }
          true;
        `);
      }
    };

    dropzone.callbacks.onPtyDataReceived = handleData;

    return () => {
      dropzone.callbacks.onPtyDataReceived = undefined;
      dropzone.closeTerminalSession(activeDevice.deviceCode);
    };
  }, [activeDevice, deviceCode]);

  // Handle messages coming from the WebView (user typing)
  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'data' && activeDevice?.deviceCode) {
        dropzone.sendTerminalData(activeDevice.deviceCode, msg.data);
      } else if (msg.type === 'resize' && activeDevice?.deviceCode) {
        dropzone.resizeTerminalSession(activeDevice.deviceCode, msg.cols, msg.rows);
      }
    } catch (e) {
      // ignore
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.3.0/css/xterm.css" />
        <script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.3.0/lib/xterm.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.8.0/lib/addon-fit.js"></script>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background-color: #0a0a0a;
            height: 100%;
            overflow: hidden;
          }
          #terminal {
            height: 100%;
            width: 100%;
            padding: 8px;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        <div id="terminal">
           <div id="loading" style="color: #666; padding: 20px; font-family: monospace;">Loading terminal engine...</div>
        </div>
        <script>
          // Wait for external scripts to load if needed
          window.onload = function() {
            document.getElementById('loading').style.display = 'none';
            var term = new window.Terminal({
            theme: {
              background: '#0a0a0a',
              foreground: '#f3f4f6',
              cursor: '#f3f4f6',
              cursorAccent: '#0a0a0a',
              selectionBackground: 'rgba(255, 255, 255, 0.3)',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
            cursorBlink: true,
            disableStdin: false
          });
          
          var fitAddon = new window.FitAddon.FitAddon();
          term.loadAddon(fitAddon);
          term.open(document.getElementById('terminal'));
          fitAddon.fit();

          window.addEventListener('resize', () => {
            fitAddon.fit();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'resize',
              cols: term.cols,
              rows: term.rows
            }));
          });

          term.onData(data => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'data',
              data: data
            }));
          });
          
          // Initial resize event
          setTimeout(() => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'resize',
              cols: term.cols,
              rows: term.rows
            }));
          }, 500);
          };
        </script>
      </body>
    </html>
  `;

  if (activeDevice) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setActiveDevice(null)} style={styles.backBtn} hitSlop={10}>
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
          source={{ html: htmlContent }}
          originWhitelist={['*']}
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
              onPress={() => setActiveDevice({ pairingId: d.pairingId, deviceCode: d.deviceCode, name: d.deviceName })}
            >
              <Card style={styles.deviceCard}>
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
                    Connect to shell
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
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
  }
});
