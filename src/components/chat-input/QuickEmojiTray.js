import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { SYSTEM_EMOJIS } from '../../constants/emojis';

export const QuickEmojiTray = ({
  visible,
  customEmojis = [],
  onSelectEmoji,
  onAddCustomEmoji,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BIỂU CẢM NHANH</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={16} color={THEME.textDim} />
        </TouchableOpacity>
      </View>

      {/* 1. System standard emojis */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {SYSTEM_EMOJIS.map((em, i) => (
          <TouchableOpacity
            key={i}
            style={styles.emojiItem}
            onPress={() => onSelectEmoji(em.char)}
            activeOpacity={0.6}
          >
            <Text style={styles.emojiChar}>{em.char}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 2. Workspace Custom Emojis (Slack-style) */}
      <View style={styles.customSection}>
        <View style={styles.customHeaderRow}>
          <Text style={styles.customTitle}>CUSTOM EMOJI WORKSPACE</Text>
          {onAddCustomEmoji && (
            <TouchableOpacity
              style={styles.addEmojiBadge}
              onPress={onAddCustomEmoji}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={13} color={THEME.primary} />
              <Text style={styles.addEmojiBadgeText}>Thêm Emoji</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {onAddCustomEmoji && (
            <TouchableOpacity
              style={styles.addEmojiItemBtn}
              onPress={onAddCustomEmoji}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={18} color={THEME.primary} />
              <Text style={styles.addEmojiBtnLabel}>Thêm mới</Text>
            </TouchableOpacity>
          )}

          {customEmojis.map((e) => (
            <TouchableOpacity
              key={e.shortcode}
              style={styles.customItem}
              onPress={() => onSelectEmoji(e.shortcode)}
              activeOpacity={0.6}
            >
              <Image source={{ uri: e.imageUrl }} style={styles.customImg} />
              <Text style={styles.customLabel} numberOfLines={1}>
                {e.shortcode}
              </Text>
            </TouchableOpacity>
          ))}

          {customEmojis.length === 0 && (
            <Text style={styles.emptyCustomHint}>
              Chưa có emoji tùy biến. Nhấn "+ Thêm mới" để tải lên!
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  emojiItem: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emojiChar: {
    fontSize: 18,
  },
  customSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  customHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.8,
  },
  addEmojiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addEmojiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primary,
  },
  addEmojiItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radiusSm,
  },
  addEmojiBtnLabel: {
    fontSize: 11,
    color: THEME.primary,
    fontWeight: '700',
  },
  customItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radiusSm,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  customImg: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  customLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  emptyCustomHint: {
    fontSize: 11,
    color: THEME.textDim,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});
