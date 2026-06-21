import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors, spacing, fontSize } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GlobalTransferToast() {
  const transfers = useStore((s) => s.transfers);
  const insets = useSafeAreaInsets();
  
  // Find any active receiving transfer
  const activeTransfer = transfers.find(
    (t) => t.direction === 'receive' && (t.status === 'in_progress' || t.status === 'completed')
  );

  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (activeTransfer) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      if (activeTransfer.status === 'completed') {
        // Auto hide after 3 seconds
        const timer = setTimeout(() => {
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [activeTransfer?.status, activeTransfer?.fileId]);

  if (!activeTransfer) return null;

  return (
    <Animated.View style={[styles.container, { top: Math.max(insets.top, spacing.md), transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={activeTransfer.status === 'completed' ? 'checkmark-circle' : 'download-outline'} 
            size={24} 
            color={colors.primary} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {activeTransfer.status === 'completed' ? 'Download Complete' : 'Downloading...'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {activeTransfer.fileName}
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{activeTransfer.progress}%</Text>
        </View>
      </View>
      {activeTransfer.status === 'in_progress' && (
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${activeTransfer.progress}%` }]} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  progressContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: colors.border,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
