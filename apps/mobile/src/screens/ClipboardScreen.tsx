import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { colors, spacing, fontSize } from '../theme';
import { useStore } from '../store';
import { dropzone } from '../services/dropzone';

export function ClipboardScreen() {
  const { clips } = useStore();
  const [sending, setSending] = useState(false);

  const sendCurrent = async () => {
    setSending(true);
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) {
        Alert.alert('Clipboard empty', 'Copy something first');
        return;
      }
      await dropzone.sendClipboard(text);
      Alert.alert('Sent', 'Clipboard pushed to paired devices');
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    } finally {
      setSending(false);
    }
  };

  const timeAgo = (t: number) => {
    const d = Date.now() - t;
    if (d < 60000) return 'just now';
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    return `${Math.floor(d / 3600000)}h ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clipboard</Text>
          <Text style={styles.subtitle}>Synced across devices</Text>
        </View>
        <Button
          label={sending ? '...' : 'Push'}
          icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.primaryForeground} />}
          style={{ paddingHorizontal: spacing.md }}
          onPress={sendCurrent}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {clips.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No clipboard activity</Text>
            <Text style={styles.emptyText}>Content from paired devices appears here</Text>
          </View>
        ) : (
          clips.map((item) => (
            <Card key={item.id} style={styles.item}>
              <Ionicons
                name={item.from ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                size={20}
                color={item.from ? colors.primary : colors.mutedForeground}
              />
              <View style={styles.itemContent}>
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.content}
                </Text>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemTime}>{timeAgo(item.time)}</Text>
                  {item.from && <Badge label={`from ${item.from.slice(0, 4)}`} variant="outline" />}
                </View>
              </View>
              <Pressable hitSlop={8} onPress={() => Clipboard.setStringAsync(item.content)}>
                <Ionicons name="copy-outline" size={18} color={colors.mutedForeground} />
              </Pressable>
            </Card>
          ))
        )}
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
  list: { gap: spacing.sm, paddingBottom: spacing.xxl },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  itemContent: { flex: 1 },
  itemText: { fontSize: fontSize.sm, color: colors.foreground, fontFamily: 'monospace' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  itemTime: { fontSize: fontSize.xs, color: colors.mutedForeground },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  emptyText: { fontSize: fontSize.sm, color: colors.mutedForeground },
});
