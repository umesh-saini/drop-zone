import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Alert, Image } from 'react-native';
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

  // File Operations State
  const [selectedEntry, setSelectedEntry] = useState<FileEntry | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  
  const [clipboardAction, setClipboardAction] = useState<{ type: 'copy' | 'move'; entry: FileEntry } | null>(null);
  
  const [showRename, setShowRename] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  
  const [showProperties, setShowProperties] = useState(false);
  const [properties, setProperties] = useState<any>(null);

  const [showViewer, setShowViewer] = useState(false);
  const [viewerContent, setViewerContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [showImage, setShowImage] = useState(false);
  const [imageBase64, setImageBase64] = useState('');

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

  const refreshCurrent = async () => {
    if (currentPath) {
      const p = currentPath;
      setPathHistory(h => h);
      
      const res = await dropzone.remoteRequest(targetDevice, { type: 'list_directory', path: p });
      if (res.success) {
        const sorted = (res.data as FileEntry[]).sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        setEntries(sorted);
      }
    }
  };

  const goBack = () => {
    const prev = pathHistory[pathHistory.length - 1];
    if (prev) {
      setPathHistory((h) => h.slice(0, -1));
      
      setLoading(true);
      dropzone.remoteRequest(targetDevice, { type: 'list_directory', path: prev }).then(res => {
        if (res.success) {
          setCurrentPath(prev);
          const sorted = (res.data as FileEntry[]).sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
          setEntries(sorted);
        } else {
          setError(res.error || 'Access denied');
        }
        setLoading(false);
      });
    } else {
      setCurrentPath(null);
      setEntries([]);
      loadRoots();
    }
  };

  const openOptions = (entry: FileEntry) => {
    setSelectedEntry(entry);
    setShowOptions(true);
  };

  const handleAction = async (action: string) => {
    setShowOptions(false);
    if (!selectedEntry) return;

    switch (action) {
      case 'download':
        // Alert.alert('Download', `Downloading ${selectedEntry.name} to your device...`);
        await dropzone.remoteRequest(targetDevice, { type: 'download_file', path: selectedEntry.path });
        break;
      case 'extract':
        setLoading(true);
        const dest = currentPath + '/' + selectedEntry.name.replace('.zip', '');
        await dropzone.remoteRequest(targetDevice, { type: 'extract_archive', path: selectedEntry.path, destPath: dest });
        await refreshCurrent();
        setLoading(false);
        break;
      case 'delete':
        Alert.alert('Delete', `Are you sure you want to delete ${selectedEntry.name}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
            setLoading(true);
            await dropzone.remoteRequest(targetDevice, { type: 'delete', path: selectedEntry.path });
            await refreshCurrent();
            setLoading(false);
          }},
        ]);
        break;
      case 'rename':
        setRenameInput(selectedEntry.name);
        setShowRename(true);
        break;
      case 'properties':
        setLoading(true);
        const res = await dropzone.remoteRequest(targetDevice, { type: 'get_properties', path: selectedEntry.path });
        if (res.success) setProperties(res.data);
        setLoading(false);
        setShowProperties(true);
        break;
      case 'copy':
        setClipboardAction({ type: 'copy', entry: selectedEntry });
        break;
      case 'move':
        setClipboardAction({ type: 'move', entry: selectedEntry });
        break;
      case 'view':
        const ext = selectedEntry.name.split('.').pop()?.toLowerCase();
        
        // Image Preview
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
          setLoading(true);
          try {
            if (selectedEntry.size > 1024 * 512) {
              // Chunked load for large images
              let allBase64 = '';
              const CHUNK_SIZE = 3 * 1024 * 170; // 522240 bytes (multiple of 3)
              const totalChunks = Math.ceil(selectedEntry.size / CHUNK_SIZE);
              
              for (let i = 0; i < totalChunks; i++) {
                const offset = i * CHUNK_SIZE;
                const length = Math.min(CHUNK_SIZE, selectedEntry.size - offset);
                const res = await dropzone.remoteRequest(targetDevice, { type: 'read_file_chunk', path: selectedEntry.path, offset, length });
                if (!res.success) throw new Error(res.error || 'Chunk read failed');
                allBase64 += res.data.content.replace(/[\r\n]+/g, '');
              }
              setImageBase64(`data:image/${ext};base64,${allBase64}`);
            } else {
              const res = await dropzone.remoteRequest(targetDevice, { type: 'read_file_base64', path: selectedEntry.path });
              if (!res.success) throw new Error(res.error || 'Read failed');
              setImageBase64(`data:image/${ext};base64,${res.data.content.replace(/[\r\n]+/g, '')}`);
            }
            setShowImage(true);
          } catch (e) {
            Alert.alert('Error', 'Cannot read image. It may be too large or inaccessible.');
          }
          setLoading(false);
          return;
        }

        // Text File View/Edit
        setLoading(true);
        const readRes = await dropzone.remoteRequest(targetDevice, { type: 'read_file', path: selectedEntry.path });
        if (readRes.success) {
          setViewerContent(readRes.data.content);
          setIsEditing(false);
          setShowViewer(true);
        } else {
          Alert.alert('Error', 'Cannot read this file. It might be binary or unsupported.');
        }
        setLoading(false);
        break;
    }
  };

  const handleRenameSubmit = async () => {
    if (!selectedEntry || !renameInput || renameInput === selectedEntry.name || !currentPath) {
      setShowRename(false);
      return;
    }
    
    setLoading(true);
    setShowRename(false);
    const destPath = currentPath + '/' + renameInput;
    await dropzone.remoteRequest(targetDevice, { type: 'rename', path: selectedEntry.path, destPath });
    await refreshCurrent();
    setLoading(false);
  };

  const handlePaste = async () => {
    if (!clipboardAction || !currentPath) return;
    setLoading(true);
    const destPath = currentPath + '/' + clipboardAction.entry.name;
    await dropzone.remoteRequest(targetDevice, { 
      type: clipboardAction.type, 
      path: clipboardAction.entry.path, 
      destPath 
    });
    setClipboardAction(null);
    await refreshCurrent();
    setLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry) return;
    setLoading(true);
    await dropzone.remoteRequest(targetDevice, { type: 'write_file', path: selectedEntry.path, content: viewerContent });
    setIsEditing(false);
    setLoading(false);
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

  const isArchive = selectedEntry?.name.toLowerCase().endsWith('.zip');
  const isVideo = ['mp4', 'mkv', 'avi', 'mov'].includes(selectedEntry?.name.split('.').pop()?.toLowerCase() || '');

  return (
    <View style={{ flex: 1 }}>
      {/* Navigation bar */}
      {currentPath && (
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
      )}

      {loading && currentPath && <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />}

      {!currentPath ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>{targetDeviceName}'s folders</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : roots.map((root) => (
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
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>Empty folder</Text>
          ) : (
            entries.map((entry) => (
              <Pressable
                key={entry.path}
                style={styles.fileRow}
                onPress={() => entry.isDirectory ? navigateTo(entry.path) : openOptions(entry)}
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
                <Pressable onPress={() => openOptions(entry)} hitSlop={15} style={{ padding: 4 }}>
                  <Ionicons name="ellipsis-vertical" size={16} color={colors.mutedForeground} />
                </Pressable>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Paste Bar */}
      {clipboardAction && currentPath && (
        <View style={styles.pasteBar}>
          <Text style={styles.pasteText}>
            {clipboardAction.type === 'copy' ? 'Copying' : 'Moving'} {clipboardAction.entry.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => setClipboardAction(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handlePaste} style={styles.retryBtn}>
              <Text style={styles.retryText}>Paste Here</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Action Sheet Modal */}
      <Modal visible={showOptions} transparent animationType="slide" onRequestClose={() => setShowOptions(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowOptions(false)}>
          <View style={styles.actionSheet}>
            <Text style={styles.sheetTitle} numberOfLines={1}>{selectedEntry?.name}</Text>
            <View style={styles.sheetDivider} />
            
            {!selectedEntry?.isDirectory && (
              <>
                {isArchive && (
                  <Pressable style={styles.sheetItem} onPress={() => handleAction('extract')}>
                    <Ionicons name="archive-outline" size={22} color={colors.foreground} />
                    <Text style={styles.sheetText}>Extract Archive</Text>
                  </Pressable>
                )}

                <Pressable style={styles.sheetItem} onPress={() => handleAction('download')}>
                  <Ionicons name={isVideo ? "play-circle-outline" : "cloud-download-outline"} size={22} color={colors.foreground} />
                  <Text style={styles.sheetText}>{isVideo ? 'Download to Gallery' : 'Download to this device'}</Text>
                </Pressable>

                {!isArchive && !isVideo && (
                  <Pressable style={styles.sheetItem} onPress={() => handleAction('view')}>
                    <Ionicons name="eye-outline" size={22} color={colors.foreground} />
                    <Text style={styles.sheetText}>Preview / Edit</Text>
                  </Pressable>
                )}
              </>
            )}
            
            <Pressable style={styles.sheetItem} onPress={() => handleAction('copy')}>
              <Ionicons name="copy-outline" size={22} color={colors.foreground} />
              <Text style={styles.sheetText}>Copy</Text>
            </Pressable>
            
            <Pressable style={styles.sheetItem} onPress={() => handleAction('move')}>
              <Ionicons name="cut-outline" size={22} color={colors.foreground} />
              <Text style={styles.sheetText}>Move</Text>
            </Pressable>
            
            <Pressable style={styles.sheetItem} onPress={() => handleAction('rename')}>
              <Ionicons name="pencil-outline" size={22} color={colors.foreground} />
              <Text style={styles.sheetText}>Rename</Text>
            </Pressable>
            
            <Pressable style={styles.sheetItem} onPress={() => handleAction('properties')}>
              <Ionicons name="information-circle-outline" size={22} color={colors.foreground} />
              <Text style={styles.sheetText}>Properties</Text>
            </Pressable>
            
            <Pressable style={[styles.sheetItem, { borderBottomWidth: 0 }]} onPress={() => handleAction('delete')}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
              <Text style={[styles.sheetText, { color: '#EF4444' }]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={showRename} transparent animationType="fade" onRequestClose={() => setShowRename(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Rename</Text>
            <TextInput
              style={styles.input}
              value={renameInput}
              onChangeText={setRenameInput}
              autoFocus
            />
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setShowRename(false)} style={{ padding: 10 }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleRenameSubmit} style={styles.retryBtn}>
                <Text style={styles.retryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Properties Modal */}
      <Modal visible={showProperties} transparent animationType="fade" onRequestClose={() => setShowProperties(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Properties</Text>
            {properties ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.propText}><Text style={{ fontWeight: 'bold' }}>Size:</Text> {formatSize(properties.size)}</Text>
                <Text style={styles.propText}><Text style={{ fontWeight: 'bold' }}>Created:</Text> {new Date(properties.created).toLocaleString()}</Text>
                <Text style={styles.propText}><Text style={{ fontWeight: 'bold' }}>Modified:</Text> {new Date(properties.modified).toLocaleString()}</Text>
                <Text style={styles.propText}><Text style={{ fontWeight: 'bold' }}>Type:</Text> {properties.isDirectory ? 'Folder' : 'File'}</Text>
              </View>
            ) : <ActivityIndicator color={colors.primary} />}
            <View style={[styles.dialogActions, { justifyContent: 'center', marginTop: 20 }]}>
              <Pressable onPress={() => setShowProperties(false)} style={styles.retryBtn}>
                <Text style={styles.retryText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Text Viewer Modal */}
      <Modal visible={showViewer} animationType="slide" onRequestClose={() => setShowViewer(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 50 }}>
          <View style={styles.viewerHeader}>
            <Pressable onPress={() => setShowViewer(false)} style={styles.navBtn}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={styles.sheetTitle} numberOfLines={1}>{selectedEntry?.name}</Text>
            {isEditing ? (
              <Pressable onPress={handleSaveEdit} style={styles.retryBtn}>
                <Text style={styles.retryText}>Save</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setIsEditing(true)} style={styles.navBtn}>
                <Ionicons name="pencil" size={20} color={colors.foreground} />
              </Pressable>
            )}
          </View>
          {/* ScrollView wraps TextInput so large text doesn't cut off */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
            <TextInput
              style={styles.viewerInput}
              value={viewerContent}
              onChangeText={setViewerContent}
              editable={isEditing}
              multiline
              textAlignVertical="top"
              scrollEnabled={false} // Let the outer ScrollView handle scrolling
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={showImage} transparent animationType="fade" onRequestClose={() => setShowImage(false)}>
        <View style={styles.imageOverlay}>
          <Pressable onPress={() => setShowImage(false)} style={styles.imageCloseBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
          {imageBase64 ? (
            <Image 
              source={{ uri: imageBase64 }} 
              style={{ width: '100%', height: '100%' }} 
              resizeMode="contain" 
            />
          ) : (
            <ActivityIndicator color="#FFF" size="large" />
          )}
        </View>
      </Modal>

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
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  cancelText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.foreground },
  list: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.md },
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
    marginLeft: spacing.sm,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  actionSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 30,
    paddingTop: 10,
  },
  sheetTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 10,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '55',
  },
  sheetText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  pasteBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  pasteText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
    flex: 1,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
  },
  dialogTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  propText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewerInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.sm,
    padding: 20,
    fontFamily: 'monospace',
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  }
});
