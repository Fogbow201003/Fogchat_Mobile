import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { Avatar } from '../../components/Avatar';
import { formatRelativeTime } from '../../utils/date';

export const PinnedMessagesModal = ({
  visible,
  onClose,
  channelName,
  pinnedMessages = [],
  onUnpin,
  onJumpToMessage,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleWrap}>
                  <View style={styles.badgeRow}>
                    <Ionicons name="pin" size={16} color="#F59E0B" />
                    <Text style={styles.title}>TIN NHẮN ĐÃ GHIM</Text>
                  </View>
                  <Text style={styles.subtitle}>
                    #{channelName || 'kênh'} • {pinnedMessages.length} tin nhắn quan trọng
                  </Text>
                </View>

                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={THEME.textDim} />
                </TouchableOpacity>
              </View>

              {/* Pinned Messages List */}
              <FlatList
                data={pinnedMessages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                      <Ionicons name="pin-outline" size={36} color={THEME.textDim} />
                    </View>
                    <Text style={styles.emptyTitle}>Chưa có tin nhắn ghim</Text>
                    <Text style={styles.emptyDesc}>
                      Nhấn giữ vào bất kỳ tin nhắn quan trọng nào trong kênh rồi chọn "Ghim tin nhắn" để lưu tại đây.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const user = item.user || {};
                  return (
                    <View style={styles.messageCard}>
                      <View style={styles.cardHeader}>
                        <Avatar
                          uri={user.avatarUrl}
                          name={user.name || user.username}
                          size={32}
                        />
                        <View style={styles.cardUserInfo}>
                          <Text style={styles.userName}>{user.name || user.username || 'Thành viên'}</Text>
                          <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                        </View>

                        {onUnpin && (
                          <TouchableOpacity
                            style={styles.unpinBtn}
                            onPress={() => onUnpin(item.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pin-outline" size={14} color={THEME.accent} />
                            <Text style={styles.unpinText}>Bỏ ghim</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Content */}
                      {!!item.content && (
                        <Text style={styles.messageContent}>{item.content}</Text>
                      )}

                      {/* Image Preview */}
                      {!!item.fileUrl && (
                        <Image source={{ uri: item.fileUrl }} style={styles.mediaPreview} />
                      )}

                      {onJumpToMessage && (
                        <TouchableOpacity
                          style={styles.jumpBtn}
                          onPress={() => {
                            onClose();
                            onJumpToMessage(item);
                          }}
                        >
                          <Text style={styles.jumpText}>Xem trong luồng chat</Text>
                          <Ionicons name="arrow-forward" size={13} color={THEME.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingTop: 12,
    maxHeight: '80%',
    minHeight: '45%',
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.borderLight,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  titleWrap: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textSecondary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: THEME.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageCard: {
    backgroundColor: THEME.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardUserInfo: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  timeText: {
    fontSize: 10,
    color: THEME.textDim,
    marginTop: 1,
  },
  unpinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  unpinText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  messageContent: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  mediaPreview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    resizeMode: 'cover',
    marginBottom: 8,
  },
  jumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  jumpText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
});
