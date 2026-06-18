import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, radius } from '../theme';

const transfers = [
  {
    id: '1',
    name: 'presentation.pdf',
    size: '2.4 MB',
    progress: 100,
    status: 'completed',
    dir: 'receive',
  },
  {
    id: '2',
    name: 'vacation-photos.zip',
    size: '45 MB',
    progress: 62,
    status: 'in_progress',
    dir: 'send',
  },
];

export function FilesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Files</Text>
          <Text style={styles.subtitle}>Send & receive</Text>
        </View>
        <Button
          label="Send"
          icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.primaryForeground} />}
          style={{ paddingHorizontal: spacing.md }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {transfers.map((t) => (
          <Card key={t.id} style={styles.item}>
            <View style={styles.row}>
              <View style={styles.iconBox}>
                <Ionicons
                  name={t.dir === 'send' ? 'arrow-up' : 'arrow-down'}
                  size={18}
                  color={t.dir === 'send' ? colors.primary : colors.success}
                />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={styles.size}>{t.size}</Text>
              </View>
              <Badge
                label={t.status === 'in_progress' ? `${t.progress}%` : t.status}
                variant={t.status === 'completed' ? 'success' : 'secondary'}
              />
            </View>
            {t.status === 'in_progress' && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${t.progress}%` }]} />
              </View>
            )}
          </Card>
        ))}
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
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
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
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
});
