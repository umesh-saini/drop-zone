import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../Card';
import { colors, spacing, fontSize, radius } from '../../theme';
import { dropzone } from '../../services/dropzone';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
  mimeType?: string;
}

interface RootDir {
  label: string;
  path: string;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const fileIcon = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image-outline';
  if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) return 'videocam-outline';
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'musical-note-outline';
  if (['zip', 'tar', 'gz', 'rar'].includes(ext)) return 'archive-outline';
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return 'document-text-outline';
  return 'document-outline';
};

interface Props {
  targetDevice: string;
  targetDeviceName: string;
}

export function RemoteExplorer({ targetDevice, targetDeviceName }: Props) {
  const [loading, setLoading] = useState(false);
  const [roots, setRoots] = useState<RootDir[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoots();
  }, [targetDevice]);

  const loadRoots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dropzone.remoteRequest(targetDevice, { type: 'list_roots' });
      if (res.success) {
        setRoots(res.data);
        setCurrentPath(null);
        setEntries([]);
      } else {
        setError(res.error || 'Failed to load');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = async (dirPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dropzone.remoteRequest(targetDevice, {
        type: 'list_directory',
        path: dirPath,
      });
      if (res.success) {
        if (currentPath) setPathHistory((h) => [...h, currentPath]);
        setCurrentPath(dirPath);
        const sorted = (res.data as FileEntry[]).sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        setEntries(sorted);
      } else {
        setError(res.error || 'Access denied');
      }
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    const prev = pathHistory[pathHistory.length - 1];
    if (prev) {
      setPathHistory((h) => h.slice(0, -1));
      navigateTo(prev);
    } else {
      setCurrentPath(null);
      setEntries([]);
      loadRoots();
    }
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.mutedForeground} />
        <Text style={styles.errorTitle}>Cannot access</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={loadRoots} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Root view
  if (!currentPath) {
    return (
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{targetDeviceName}'s folders</Text>
        {roots.map((root) => (
          <Card key={root.path} style={styles.item}>
            <Pressable style={styles.itemRow} onPress={() => navigateTo(root.path)}>
              <View style={styles.iconBox}>
                <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{root.label}</Text>
                <Text style={styles.path} numberOfLines={1}>
                  {root.path}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    );
  }

  // Directory listing
  return (
    <View style={{ flex: 1 }}>
      {/* Navigation bar */}
      <View style={styles.navBar}>
        <Pressable onPress={goBack} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={() => {
            setCurrentPath(null);
            setPathHistory([]);
            loadRoots();
          }}
          hitSlop={8}
          style={styles.navBtn}
        >
          <Ionicons name="home-outline" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={styles.navPath} numberOfLines={1}>
          {currentPath.split('/').pop() || currentPath}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>Empty folder</Text>
        ) : (
          entries.map((entry) => (
            <Pressable
              key={entry.path}
              style={styles.fileRow}
              onPress={() => entry.isDirectory && navigateTo(entry.path)}
              disabled={!entry.isDirectory}
            >
              <Ionicons
                name={entry.isDirectory ? 'folder-outline' : (fileIcon(entry.name) as any)}
                size={20}
                color={entry.isDirectory ? colors.primary : colors.mutedForeground}
              />
              <Text style={styles.fileName} numberOfLines={1}>
                {entry.name}
              </Text>
              <Text style={styles.fileSize}>{formatSize(entry.size)}</Text>
              {entry.isDirectory && (
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              )}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  errorTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  errorText: { fontSize: fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  retryText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primaryForeground },
  list: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.mutedForeground,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  item: { padding: 0 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  path: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPath: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: 'monospace',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  fileName: { flex: 1, fontSize: fontSize.sm, color: colors.foreground },
  fileSize: { fontSize: fontSize.xs, color: colors.mutedForeground },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
});
