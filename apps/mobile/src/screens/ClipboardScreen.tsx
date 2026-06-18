import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { colors, spacing, fontSize } from '../theme';

const history = [
  {
    id: '1',
    content: 'https://github.com/dropzone/app',
    from: 'My Laptop',
    time: '2m ago',
    remote: true,
  },
  {
    id: '2',
    content: 'npm install @dropzone/shared',
    from: 'Work PC',
    time: '15m ago',
    remote: true,
  },
  {
    id: '3',
    content: 'Meeting notes: discuss Q3 roadmap',
    from: null,
    time: '1h ago',
    remote: false,
  },
];

export function ClipboardScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clipboard</Text>
        <Text style={styles.subtitle}>Synced across your devices</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {history.map((item) => (
          <Card key={item.id} style={styles.item}>
            <Ionicons
              name={item.remote ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
              size={20}
              color={item.remote ? colors.primary : colors.mutedForeground}
            />
            <View style={styles.itemContent}>
              <Text style={styles.itemText} numberOfLines={1}>
                {item.content}
              </Text>
              <View style={styles.itemMeta}>
                <Text style={styles.itemTime}>{item.time}</Text>
                {item.from && <Badge label={`from ${item.from}`} variant="outline" />}
              </View>
            </View>
            <Pressable hitSlop={8}>
              <Ionicons name="copy-outline" size={18} color={colors.mutedForeground} />
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  list: { gap: spacing.sm, paddingBottom: spacing.xxl },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  itemContent: { flex: 1 },
  itemText: { fontSize: fontSize.sm, color: colors.foreground, fontFamily: 'monospace' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  itemTime: { fontSize: fontSize.xs, color: colors.mutedForeground },
});
