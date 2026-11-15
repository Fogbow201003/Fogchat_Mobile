import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { workspaceApi } from '../../services/api';
import { Avatar } from '../../components/Avatar';

export const DirectMessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { activeWorkspace, onlineUsers, workspaceMembers = [], openDirectChat, channels, unreadCounts = {}, markChannelAsRead } = useChat();

  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMembers = async () => {
    if (!activeWorkspace) return;
    try {
      const data = await workspaceApi.getWorkspaceMembers(activeWorkspace.id);
      const list = Array.isArray(data) ? data : (data.data || data.members || []);
      // Filter out self
      const others = list.map(m => m.user || m).filter(u => u && u.id !== user?.id);
      setMembers(others);
    } catch (e) {
      console.warn('fetchMembers error:', e.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeWorkspace?.id]);

  const handleStartChat = async (targetUser) => {
    try {
      const directChannel = await openDirectChat(targetUser.id);
      if (directChannel?.id && markChannelAsRead) {
        markChannelAsRead(directChannel.id);
      }
      navigation.navigate('ChatRoom', {
        channelId: directChannel.id,
        channelName: targetUser.name || targetUser.username,
        isDirect: true,
        targetUser,
      });
    } catch (err) {
      console.error('Error starting direct chat:', err);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.username && m.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.headerWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={THEME.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm đồng nghiệp để nhắn tin..."
            placeholderTextColor={THEME.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Members list */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách thành viên...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchMembers();
              }}
              tintColor={THEME.primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              THÀNH VIÊN TRONG KHÔNG GIAN ({filteredMembers.length})
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không tìm thấy đồng nghiệp nào</Text>
          }
          renderItem={({ item }) => {
            const liveMember = workspaceMembers.find((wm) => wm.id === item.id);
            const member = liveMember ? { ...item, ...liveMember } : item;
            const isOnline = onlineUsers.has(member.id);
            const effectiveStatus = isOnline ? (member.status || 'ONLINE') : 'OFFLINE';
            const statusMeta =
              effectiveStatus === 'AWAY'
                ? { label: 'VẮNG MẶT', bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }
                : effectiveStatus === 'DND'
                ? { label: 'ĐỪNG LÀM PHIỀN', bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }
                : effectiveStatus === 'ONLINE'
                ? { label: 'ONLINE', bg: 'rgba(16, 185, 129, 0.15)', color: THEME.success }
                : null;
            const dmChannel = channels.find(
              (c) =>
                c.type === 'DIRECT' &&
                (c.members?.some((m) => m.userId === member.id) ||
                  c.name?.includes(member.username) ||
                  c.name?.includes(member.id))
            );
            const unread = dmChannel ? unreadCounts[dmChannel.id] || 0 : 0;

            return (
              <TouchableOpacity
                style={[styles.memberCard, unread > 0 && styles.memberCardUnread]}
                onPress={() => handleStartChat(member)}
                activeOpacity={0.7}
              >
                <Avatar
                  uri={member.avatarUrl}
                  name={member.name || member.username}
                  size={46}
                  isOnline={isOnline}
                  status={effectiveStatus}
                  showStatus={true}
                />

                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.memberName, unread > 0 && styles.memberNameUnread]}>
                      {member.name || member.username}
                    </Text>
                    {statusMeta && (
                      <View style={[styles.onlineBadge, { backgroundColor: statusMeta.bg }]}>
                        <Text style={[styles.onlineBadgeText, { color: statusMeta.color }]}>
                          {statusMeta.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberUsername}>@{member.username}</Text>
                </View>

                <View style={styles.rightActionWrap}>
                  {unread > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {unread > 99 ? '99+' : unread}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.chatIconWrap}>
                      <Ionicons name="chatbubble-ellipses" size={18} color={THEME.primary} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
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
  headerWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: THEME.text,
    fontSize: 13,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: THEME.textDim,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textDim,
    letterSpacing: 1,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: THEME.textDim,
    marginTop: 32,
    fontSize: 14,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    padding: 12,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 8,
    gap: 12,
  },
  memberCardUnread: {
    borderColor: 'rgba(6, 182, 212, 0.4)',
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
  },
  memberNameUnread: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  onlineBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  onlineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.success,
  },
  memberUsername: {
    fontSize: 12,
    color: THEME.textDim,
    marginTop: 2,
  },
  rightActionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#0B0E14',
    fontSize: 11,
    fontWeight: '800',
  },
  chatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
