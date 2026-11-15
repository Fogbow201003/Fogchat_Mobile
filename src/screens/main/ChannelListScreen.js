import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../config/theme';
import * as Clipboard from 'expo-clipboard';
import { useChat } from '../../context/ChatContext';
import { CreateChannelModal } from '../modals/CreateChannelModal';
import { CreateWorkspaceModal } from '../modals/CreateWorkspaceModal';
import { SearchMessagesModal } from '../modals/SearchMessagesModal';

export const ChannelListScreen = ({ navigation }) => {
  const {
    channels,
    activeWorkspace,
    isLoadingWorkspaces,
    workspaces,
    setActiveWorkspace,
    setActiveChannel,
    activeChannel,
    unreadCounts = {},
    markChannelAsRead,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [wsModalMode, setWsModalMode] = useState('create');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Đảm bảo khi quay lại màn hình danh sách kênh thì activeChannel được reset về null để nhận thông báo & badge chưa đọc
  useFocusEffect(
    useCallback(() => {
      setActiveChannel(null);
    }, [setActiveChannel])
  );

  // Filter channels by search and exclude DIRECT
  const filteredChannels = channels.filter(
    (c) =>
      c.type !== 'DIRECT' &&
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const publicChannels = filteredChannels.filter((c) => c.type === 'PUBLIC');
  const privateChannels = filteredChannels.filter((c) => c.type === 'PRIVATE');

  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
    markChannelAsRead(channel.id);
    navigation.navigate('ChatRoom', { channelId: channel.id, channelName: channel.name });
  };

  const handlePressAdd = () => {
    if (!activeWorkspace) {
      setShowCreateWsModal(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeWorkspace) {
      setActiveWorkspace({ ...activeWorkspace });
    }
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Header with Workspace Switcher */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.workspacePill}
          onPress={() => setShowWorkspacePicker(!showWorkspacePicker)}
          activeOpacity={0.7}
        >
          <LinearGradient colors={THEME.gradientPrimary} style={styles.wsAvatar}>
            <Text style={styles.wsAvatarText}>
              {(activeWorkspace?.name || 'W').charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <View style={styles.wsTextWrap}>
            <Text style={styles.wsLabel}>WORKSPACE</Text>
            <Text style={styles.wsName} numberOfLines={1}>
              {activeWorkspace?.name || 'Chọn không gian...'}
            </Text>
          </View>
          <Ionicons
            name={showWorkspacePicker ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={THEME.textMuted}
          />
        </TouchableOpacity>

        {/* Actions: Search & Add */}
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.searchHeaderBtn}
            onPress={() => setShowSearchModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={20} color={THEME.primary} />
          </TouchableOpacity>

          {/* Create Button (+ Channel or + Workspace) */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handlePressAdd}
            activeOpacity={0.8}
          >
            <LinearGradient colors={THEME.gradientPrimary} style={styles.addBtnGradient}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Workspace Picker Dropdown */}
      {showWorkspacePicker && (
        <View style={styles.workspaceDropdown}>
          <Text style={styles.dropdownHeader}>KHÔNG GIAN LÀM VIỆC CỦA BẠN</Text>
          <ScrollView style={{ maxHeight: 150 }}>
            {workspaces.map((ws) => (
              <TouchableOpacity
                key={ws.id}
                style={[
                  styles.wsItem,
                  activeWorkspace?.id === ws.id && styles.wsItemActive,
                ]}
                onPress={() => {
                  setActiveWorkspace(ws);
                  setShowWorkspacePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.wsItemText,
                    activeWorkspace?.id === ws.id && styles.wsItemTextActive,
                  ]}
                >
                  {ws.name}
                </Text>
                {activeWorkspace?.id === ws.id && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick Add Workspace button inside dropdown */}
          <View style={styles.dropdownActionsRow}>
            <TouchableOpacity
              style={styles.addWsDropdownBtn}
              onPress={() => {
                setShowWorkspacePicker(false);
                setWsModalMode('create');
                setShowCreateWsModal(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={16} color={THEME.primary} />
              <Text style={styles.addWsDropdownText}>Tạo mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.joinWsDropdownBtn}
              onPress={() => {
                setShowWorkspacePicker(false);
                setWsModalMode('join');
                setShowCreateWsModal(true);
              }}
            >
              <Ionicons name="enter-outline" size={16} color={THEME.secondary} />
              <Text style={styles.joinWsDropdownText}>Nhập mã mời</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. Channel Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={THEME.textDim} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm kênh trò chuyện..."
          placeholderTextColor={THEME.textPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={THEME.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Main Content: Empty State or Channels List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={THEME.primary}
          />
        }
      >
        {isLoadingWorkspaces && !activeWorkspace ? (
          <View style={styles.noWsCard}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={[styles.noWsSub, { marginTop: 14 }]}>Đang tải không gian làm việc...</Text>
          </View>
        ) : !activeWorkspace ? (
          <View style={styles.noWsCard}>
            <View style={styles.noWsIconWrap}>
              <Ionicons name="briefcase-outline" size={40} color={THEME.primary} />
            </View>
            <Text style={styles.noWsTitle}>Chưa có Không gian làm việc</Text>
            <Text style={styles.noWsDesc}>
              Bạn cần tạo hoặc chọn một Workspace trước khi có thể tạo Kênh và nhắn tin cùng đồng nghiệp.
            </Text>
            <TouchableOpacity
              style={styles.noWsBtn}
              onPress={() => {
                setWsModalMode('create');
                setShowCreateWsModal(true);
              }}
              activeOpacity={0.85}
            >
              <LinearGradient colors={THEME.gradientPrimary} style={styles.noWsBtnGradient}>
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.noWsBtnText}>TẠO WORKSPACE MỚI</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Workspace Invite Code Quick Bar */}
            {activeWorkspace?.inviteCode && (
              <View style={styles.inviteBanner}>
                <View style={styles.inviteBannerLeft}>
                  <Ionicons name="key" size={14} color={THEME.secondary} />
                  <Text style={styles.inviteBannerLabel}>Mã mời Workspace:</Text>
                  <Text style={styles.inviteBannerCode} numberOfLines={1}>
                    {activeWorkspace.inviteCode}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.inviteCopyBtn}
                  onPress={async () => {
                    try {
                      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
                        await navigator.clipboard.writeText(activeWorkspace.inviteCode);
                      } else {
                        await Clipboard.setStringAsync(activeWorkspace.inviteCode);
                      }
                      Alert.alert(
                        'Đã sao chép mã mời',
                        `Mã mời: ${activeWorkspace.inviteCode}\n\nĐã sao chép vào bộ nhớ tạm. Hãy gửi mã này cho đồng nghiệp để cùng tham gia nhé!`
                      );
                    } catch (e) {
                      Alert.alert('Mã mời Workspace', activeWorkspace.inviteCode);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={13} color={THEME.primary} />
                  <Text style={styles.inviteCopyText}>Sao chép</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Public Channels Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>KÊNH CÔNG KHAI ({publicChannels.length})</Text>
            </View>

            {publicChannels.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có kênh công khai nào. Bấm dấu (+) để tạo!</Text>
            ) : (
              publicChannels.map((channel) => {
                const isActive = activeChannel?.id === channel.id;
                const unreadCount = unreadCounts[channel.id] || 0;
                return (
                  <TouchableOpacity
                    key={channel.id}
                    style={[
                      styles.channelItem,
                      isActive && styles.channelItemActive,
                      unreadCount > 0 && styles.channelItemUnread,
                    ]}
                    onPress={() => handleSelectChannel(channel)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.channelIconWrap, isActive && styles.channelIconWrapActive, unreadCount > 0 && styles.channelIconWrapUnread]}>
                      <Text style={[styles.channelHash, isActive && styles.channelHashActive, unreadCount > 0 && styles.channelHashUnread]}>#</Text>
                    </View>
                    <View style={styles.channelTextWrap}>
                      <View style={styles.channelTitleRow}>
                        <Text style={[styles.channelName, isActive && styles.channelNameActive, unreadCount > 0 && styles.channelNameUnread]}>
                          {channel.name}
                        </Text>
                        {unreadCount > 0 && <View style={styles.unreadDot} />}
                      </View>
                      {channel.description && (
                        <Text style={styles.channelDesc} numberOfLines={1}>
                          {channel.description}
                        </Text>
                      )}
                    </View>
                    {unreadCount > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={THEME.textDim} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}

            {/* Private Channels Section */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>KÊNH BẢO MẬT & DỰ ÁN ({privateChannels.length})</Text>
            </View>

            {privateChannels.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có kênh riêng tư nào</Text>
            ) : (
              privateChannels.map((channel) => {
                const isActive = activeChannel?.id === channel.id;
                const unreadCount = unreadCounts[channel.id] || 0;
                return (
                  <TouchableOpacity
                    key={channel.id}
                    style={[
                      styles.channelItem,
                      isActive && styles.channelItemActive,
                      unreadCount > 0 && styles.channelItemUnread,
                    ]}
                    onPress={() => handleSelectChannel(channel)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.channelIconWrap, isActive && styles.channelIconWrapActive, unreadCount > 0 && styles.channelIconWrapUnread]}>
                      <Ionicons
                        name="lock-closed"
                        size={14}
                        color={isActive || unreadCount > 0 ? THEME.primary : THEME.textDim}
                      />
                    </View>
                    <View style={styles.channelTextWrap}>
                      <View style={styles.channelTitleRow}>
                        <Text style={[styles.channelName, isActive && styles.channelNameActive, unreadCount > 0 && styles.channelNameUnread]}>
                          {channel.name}
                        </Text>
                        {unreadCount > 0 && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.channelDesc} numberOfLines={1}>
                        Chỉ thành viên được mời
                      </Text>
                    </View>
                    {unreadCount > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={THEME.textDim} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Modal: Create Channel */}
      <CreateChannelModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(newChan) => {
          navigation.navigate('ChatRoom', {
            channelId: newChan.id,
            channelName: newChan.name,
          });
        }}
      />

      {/* Modal: Create or Join Workspace */}
      <CreateWorkspaceModal
        visible={showCreateWsModal}
        initialMode={wsModalMode}
        onClose={() => setShowCreateWsModal(false)}
      />

      {/* Modal: Search Messages */}
      <SearchMessagesModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        workspaceId={activeWorkspace?.id}
        workspaceName={activeWorkspace?.name}
        onSelectResult={(item) => {
          if (item.channelId) {
            const ch = channels.find(c => c.id === item.channelId) || {
              id: item.channelId,
              name: item.channel?.name || 'kênh',
              type: item.channel?.type || 'PUBLIC',
            };
            setActiveChannel(ch);
            navigation.navigate('ChatRoom', {
              channelId: ch.id,
              channelName: ch.name,
            });
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
  },
  workspacePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 10,
  },
  wsAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsAvatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  wsTextWrap: {
    flex: 1,
  },
  wsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.8,
  },
  wsName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.text,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceDropdown: {
    backgroundColor: THEME.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    padding: 12,
  },
  dropdownHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textDim,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  wsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  wsItemActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  wsItemText: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  wsItemTextActive: {
    color: THEME.primaryLight,
    fontWeight: '800',
  },
  dropdownActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.divider,
    marginTop: 6,
    paddingTop: 6,
  },
  addWsDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  addWsDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  joinWsDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  joinWsDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A855F7',
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    marginTop: 6,
  },
  inviteBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  inviteBannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  inviteBannerCode: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  inviteCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inviteCopyText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  noWsCard: {
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusLg,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  noWsIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  noWsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 8,
  },
  noWsDesc: {
    fontSize: 13,
    color: THEME.textDim,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  noWsBtn: {
    borderRadius: THEME.radiusMd,
    overflow: 'hidden',
    width: '100%',
  },
  noWsBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  noWsBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  sectionHeader: {
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textDim,
    letterSpacing: 1,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 8,
    gap: 12,
  },
  channelItemActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: THEME.primary,
  },
  channelIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelIconWrapActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  channelHash: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textDim,
  },
  channelHashActive: {
    color: THEME.primary,
  },
  channelTextWrap: {
    flex: 1,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
  },
  channelNameActive: {
    color: THEME.primaryLight,
  },
  channelDesc: {
    fontSize: 12,
    color: THEME.textDim,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.textDim,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  channelItemUnread: {
    borderColor: 'rgba(6, 182, 212, 0.4)',
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
  },
  channelIconWrapUnread: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  channelHashUnread: {
    color: THEME.primary,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelNameUnread: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.primary,
  },
  unreadBadge: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#0B0E14',
    fontSize: 11,
    fontWeight: '900',
  },
});
