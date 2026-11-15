import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { Avatar } from '../Avatar';

/**
 * Modal hiển thị danh sách thành viên đã xem tin nhắn (có thể cuộn)
 */
export const ReadReceiptsModal = ({
  visible,
  receipts = [],
  onlineUsers,
  onClose,
  onSelectUser,
}) => {
  const renderItem = ({ item }) => {
    const u = item.user || {};
    const userId = item.userId || u.id;
    const isOnline = onlineUsers?.has?.(userId) || false;
    const displayName = u.name || u.username || 'Thành viên';

    return (
      <TouchableOpacity
        style={styles.userRow}
        activeOpacity={onSelectUser ? 0.7 : 1}
        disabled={!onSelectUser}
        onPress={() => {
          if (onSelectUser && u.id) {
            onClose();
            onSelectUser(u);
          }
        }}
      >
        <Avatar
          uri={u.avatarUrl}
          name={displayName}
          size={40}
          isOnline={isOnline}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          {u.username ? (
            <Text style={styles.userHandle} numberOfLines={1}>
              @{u.username}
            </Text>
          ) : null}
        </View>
        <Ionicons name="checkmark-done" size={16} color={THEME.primary} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.headerTitleWrap}>
                  <Ionicons name="eye-outline" size={18} color={THEME.primary} />
                  <Text style={styles.title}>
                    Đã xem ({receipts.length})
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={20} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={receipts}
                keyExtractor={(item, idx) => String(item.userId || item.id || idx)}
                renderItem={renderItem}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Chưa có ai xem tin nhắn này.</Text>
                }
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    paddingVertical: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: '600',
  },
  userHandle: {
    color: THEME.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: THEME.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
