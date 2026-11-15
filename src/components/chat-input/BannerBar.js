import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';

export const BannerBar = ({
  editingMessage,
  onCancelEdit,
  replyingParent,
  onCancelReply,
}) => {
  if (editingMessage) {
    return (
      <View style={styles.editBar}>
        <Ionicons name="pencil" size={14} color={THEME.accent} />
        <Text style={styles.text} numberOfLines={1}>
          Đang sửa tin nhắn: {editingMessage.content}
        </Text>
        <TouchableOpacity onPress={onCancelEdit} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={18} color={THEME.textDim} />
        </TouchableOpacity>
      </View>
    );
  }

  if (replyingParent) {
    return (
      <View style={styles.replyBar}>
        <Ionicons name="arrow-undo" size={14} color={THEME.primary} />
        <View style={styles.replyContent}>
          <Text style={styles.replyHeader}>
            Đang trả lời @{replyingParent.user?.name || replyingParent.user?.username || 'Tin nhắn'}
          </Text>
          <Text style={styles.replyExcerpt} numberOfLines={1}>
            {replyingParent.content || (replyingParent.fileUrl ? 'Tệp đính kèm' : 'Tin nhắn')}
          </Text>
        </View>
        <TouchableOpacity onPress={onCancelReply} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={18} color={THEME.textDim} />
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 8,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primaryLight,
  },
  replyExcerpt: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: THEME.textSecondary,
    fontStyle: 'italic',
  },
});
