import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { Avatar } from '../Avatar';

/**
 * Modal hiển thị chi tiết những thành viên đã thả biểu cảm (React) vào tin nhắn
 */
export const ReactionDetailsModal = ({
  visible,
  reactions = [],
  initialEmoji = null,
  customEmojis = [],
  onlineUsers,
  onSelectUser,
  onClose,
}) => {
  const [selectedEmoji, setSelectedEmoji] = useState(initialEmoji);

  useEffect(() => {
    if (visible) {
      setSelectedEmoji(initialEmoji || null);
    }
  }, [visible, initialEmoji]);

  const emojiTabs = useMemo(() => {
    const map = new Map();
    for (const r of reactions) {
      if (!r?.emoji) continue;
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    }
    return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
  }, [reactions]);

  const filteredReactions = useMemo(() => {
    if (!selectedEmoji) return reactions;
    return reactions.filter((r) => r.emoji === selectedEmoji);
  }, [reactions, selectedEmoji]);

  const renderEmojiVisual = (emoji, size = 16) => {
    const custom = customEmojis.find((c) => c.shortcode === emoji);
    if (custom) {
      return <Image source={{ uri: custom.imageUrl }} style={{ width: size, height: size, borderRadius: 4 }} />;
    }
    return <Text style={{ fontSize: size - 1 }}>{emoji}</Text>;
  };

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
          size={38}
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
        <View style={styles.emojiBadge}>
          {renderEmojiVisual(item.emoji, 18)}
        </View>
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
                  <Ionicons name="happy-outline" size={18} color={THEME.primary} />
                  <Text style={styles.title}>
                    Biểu cảm ({reactions.length})
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={20} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Emoji Filter Tabs */}
              {emojiTabs.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tabsScroll}
                  contentContainerStyle={styles.tabsContent}
                >
                  <TouchableOpacity
                    style={[styles.tabPill, !selectedEmoji && styles.tabPillActive]}
                    onPress={() => setSelectedEmoji(null)}
                  >
                    <Text style={[styles.tabText, !selectedEmoji && styles.tabTextActive]}>
                      Tất cả ({reactions.length})
                    </Text>
                  </TouchableOpacity>

                  {emojiTabs.map((tab) => {
                    const isActive = selectedEmoji === tab.emoji;
                    return (
                      <TouchableOpacity
                        key={tab.emoji}
                        style={[styles.tabPill, isActive && styles.tabPillActive]}
                        onPress={() => setSelectedEmoji(tab.emoji)}
                      >
                        {renderEmojiVisual(tab.emoji, 15)}
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                          {tab.count}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <FlatList
                data={filteredReactions}
                keyExtractor={(item, idx) => String(item.id || `${item.userId}_${item.emoji}_${idx}`)}
                renderItem={renderItem}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Chưa có biểu cảm nào.</Text>
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
    maxHeight: '72%',
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
  tabsScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tabsContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tabPillActive: {
    borderColor: THEME.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.14)',
  },
  tabText: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: THEME.primary,
    fontWeight: '700',
  },
  list: {
    maxHeight: 360,
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
  emojiBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: THEME.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
