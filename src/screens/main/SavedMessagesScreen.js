import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../../components/Avatar';
import { formatRelativeTime } from '../../utils/date';

export const SavedMessagesScreen = ({ navigation }) => {
  const { savedMessages, loadSavedMessages, toggleSaveMessage, isLoadingSaved, setActiveChannel, channels } = useChat();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadSavedMessages();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSavedMessages();
    setIsRefreshing(false);
  };

  const handleUnsave = async (messageId) => {
    await toggleSaveMessage(messageId);
  };

  const handleJumpToChannel = (message) => {
    if (!message.channelId) return;
    const targetChannel = channels.find((c) => c.id === message.channelId) || {
      id: message.channelId,
      name: message.channel?.name || 'kênh',
      type: message.channel?.type || 'PUBLIC',
    };
    setActiveChannel(targetChannel);
    navigation.navigate('ChatRoom', {
      channelId: targetChannel.id,
      channelName: targetChannel.name,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Ionicons name="bookmark" size={20} color="#A855F7" />
          </View>
          <View>
            <Text style={styles.title}>MỤC ĐÃ LƯU</Text>
            <Text style={styles.subtitle}>
              {savedMessages.length} tin nhắn cá nhân đã đánh dấu
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Messages List */}
      {isLoadingSaved && savedMessages.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Đang tải danh sách mục đã lưu...</Text>
        </View>
      ) : (
        <FlatList
          data={savedMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#A855F7"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="bookmark-outline" size={42} color={THEME.textDim} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có tin nhắn nào được lưu</Text>
              <Text style={styles.emptyDesc}>
                Khi cần lưu trữ thông tin, link tài liệu hoặc ghi chú quan trọng từ các kênh, hãy nhấn giữ tin nhắn đó và chọn "Lưu tin nhắn (Bookmark)".
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const user = item.user || {};
            const channel = item.channel || {};

            return (
              <View style={styles.card}>
                {/* Card Top: Channel Tag & Timestamp */}
                <View style={styles.cardTop}>
                  <TouchableOpacity
                    style={styles.channelBadge}
                    onPress={() => handleJumpToChannel(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.channelHash}>#</Text>
                    <Text style={styles.channelName}>{channel.name || 'kênh'}</Text>
                    <Ionicons name="arrow-forward" size={10} color={THEME.textDim} style={{ marginLeft: 3 }} />
                  </TouchableOpacity>

                  <View style={styles.topRight}>
                    <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                    <TouchableOpacity
                      style={styles.unsaveBtn}
                      onPress={() => handleUnsave(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="bookmark" size={16} color="#A855F7" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Card Middle: Author & Content */}
                <View style={styles.authorRow}>
                  <Avatar
                    uri={user.avatarUrl}
                    name={user.name || user.username}
                    size={30}
                  />
                  <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>{user.name || user.username || 'Thành viên'}</Text>
                    <Text style={styles.authorHandle}>@{user.username || 'user'}</Text>
                  </View>
                </View>

                {!!item.content && (
                  <Text style={styles.contentText}>{item.content}</Text>
                )}

                {!!item.fileUrl && (
                  <Image source={{ uri: item.fileUrl }} style={styles.mediaImage} />
                )}

                {/* Card Bottom: Jump to chat action */}
                <TouchableOpacity
                  style={styles.jumpBtn}
                  onPress={() => handleJumpToChannel(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="chatbubbles-outline" size={14} color={THEME.primary} />
                  <Text style={styles.jumpBtnText}>Xem trong luồng trò chuyện</Text>
                  <Ionicons name="chevron-forward" size={12} color={THEME.primary} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: THEME.textDim,
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    backgroundColor: THEME.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  channelHash: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primary,
    marginRight: 2,
  },
  channelName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    fontSize: 11,
    color: THEME.textDim,
  },
  unsaveBtn: {
    padding: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorInfo: {
    marginLeft: 10,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  authorHandle: {
    fontSize: 11,
    color: THEME.textDim,
  },
  contentText: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  mediaImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  jumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  jumpBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
    flex: 1,
  },
});
