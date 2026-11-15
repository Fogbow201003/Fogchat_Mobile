import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../config/theme';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { MessageBubble } from '../../components/MessageBubble';
import { ChatInput } from '../../components/ChatInput';
import { ReactionPickerModal } from '../../components/ReactionPickerModal';
import { PinnedMessagesModal } from '../modals/PinnedMessagesModal';
import { SearchMessagesModal } from '../modals/SearchMessagesModal';
import { UploadCustomEmojiModal } from '../modals/UploadCustomEmojiModal';
import { MediaViewerModal } from '../../components/modals/MediaViewerModal';
import { ReadReceiptsModal } from '../../components/modals/ReadReceiptsModal';
import { UserProfileModal } from '../../components/modals/UserProfileModal';
import { ReactionDetailsModal } from '../../components/modals/ReactionDetailsModal';
import { socketService } from '../../services/socket';
import { formatMessageDateHeader } from '../../utils/date';

export const ChatRoomScreen = ({ route, navigation }) => {
  const { channelId, channelName, isDirect = false } = route.params || {};
  const { user } = useAuth();
  const {
    activeChannel,
    setActiveChannel,
    channels,
    messages,
    isLoadingMessages,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    sendMessage,
    toggleReaction,
    deleteMessage,
    editMessage,
    openThread,
    customEmojis,
    typingUsers,
    onlineUsers,
    activeWorkspace,
    workspaceMembers,
    currentUserRole,
    isWorkspaceAdmin,
    isChannelAdmin,
    togglePinMessage,
    toggleSaveMessage,
    savedMessages = [],
    markChannelAsRead,
    unreadCounts = {},
    unreadThreads = {},
    openDirectChat,
  } = useChat();

  // Sync activeChannel if navigated with route.params
  useEffect(() => {
    isSwitchingChannelRef.current = false;
    if (channelId && (!activeChannel || activeChannel.id !== channelId)) {
      const found = channels.find((c) => c.id === channelId);
      if (found) {
        setActiveChannel(found);
      } else if (channelName) {
        setActiveChannel({
          id: channelId,
          name: channelName,
          type: isDirect ? 'DIRECT' : 'PUBLIC',
        });
      }
    }
  }, [channelId, channels]);

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingMessage, setReplyingMessage] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);
  const [showUploadEmojiModal, setShowUploadEmojiModal] = useState(false);
  const [readReceiptsModalData, setReadReceiptsModalData] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [reactionDetailsData, setReactionDetailsData] = useState(null);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState(null);
  const unreadCapturedChannelRef = useRef(null);
  const isSwitchingChannelRef = useRef(false);

  const handleOpenReactionDetails = useCallback((reactions, emoji) => {
    if (reactions && reactions.length > 0) {
      setReactionDetailsData({ reactions, initialEmoji: emoji });
    }
  }, []);

  // Clear activeChannel when actually popping out of ChatRoomScreen so home screen unread badges update
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (!isSwitchingChannelRef.current) {
        setActiveChannel(null);
      }
    });
    return unsubscribe;
  }, [navigation, setActiveChannel]);

  // Resolve DM partner profile for Header tap
  const directPartner = useMemo(() => {
    if (!isDirect) return null;
    const channelObj = activeChannel || channels.find((c) => c.id === channelId);
    const otherMember = channelObj?.members?.find(
      (m) => (m.userId || m.user?.id) !== user?.id
    );
    const baseUser = otherMember?.user;
    if (baseUser?.id) {
      const fullMember = workspaceMembers.find((m) => m.id === baseUser.id);
      return fullMember ? { ...baseUser, ...fullMember } : baseUser;
    }
    return (
      workspaceMembers.find(
        (m) => m.id !== user?.id && (m.name === channelName || m.username === channelName)
      ) || null
    );
  }, [isDirect, activeChannel, channels, channelId, user?.id, workspaceMembers, channelName]);

  const handleOpenUserProfile = useCallback(
    (clickedUser) => {
      if (!clickedUser) return;
      const fullMember = workspaceMembers.find((m) => m.id === clickedUser.id);
      setProfileUser(fullMember ? { ...clickedUser, ...fullMember } : clickedUser);
    },
    [workspaceMembers]
  );

  const handleOpenReadReceipts = useCallback((receipts) => {
    if (receipts && receipts.length > 0) {
      setReadReceiptsModalData(receipts);
    }
  }, []);

  const handleStartDirectChat = useCallback(
    async (targetUser) => {
      if (!targetUser?.id) return;
      try {
        const directChan = await openDirectChat(targetUser.id);
        if (directChan?.id) {
          isSwitchingChannelRef.current = true;
          navigation.replace('ChatRoom', {
            channelId: directChan.id,
            channelName: targetUser.name || targetUser.username || directChan.name,
            isDirect: true,
          });
        }
      } catch (err) {
        Alert.alert('Lỗi', err?.message || 'Không thể mở cuộc trò chuyện trực tiếp');
      }
    },
    [openDirectChat, navigation]
  );

  const handleOpenImage = (imageUrl, senderName, createdAt) => {
    setViewerImage({ imageUrl, senderName, createdAt });
  };

  const flatListRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isNearBottomRef = useRef(true);

  const handleScroll = useCallback((event) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (contentOffset.y <= 20 && !isLoadingMore && hasMoreMessages) {
      loadMoreMessages();
    }
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const isNear = distanceFromBottom < 120;
    isNearBottomRef.current = isNear;
    if (isNear) {
      setShowScrollBottom(false);
    }
  }, [isLoadingMore, hasMoreMessages, loadMoreMessages]);

  // Filter top-level messages for current channel (exclude thread replies)
  const channelMessages = useMemo(() => {
    return messages.filter(
      (m) => m.channelId === (channelId || activeChannel?.id) && !m.parentId
    );
  }, [messages, channelId, activeChannel?.id]);

  // Compute pinned messages for this channel
  const pinnedMessages = useMemo(() => {
    return channelMessages.filter((m) => m.isPinned);
  }, [channelMessages]);

  // Chụp mốc tin nhắn chưa đọc đầu tiên khi mở kênh/DM (chuẩn Slack / Mattermost)
  const targetChannelId = channelId || activeChannel?.id;
  useEffect(() => {
    unreadCapturedChannelRef.current = null;
    setFirstUnreadMessageId(null);
  }, [targetChannelId]);

  useEffect(() => {
    if (!targetChannelId || !user?.id || channelMessages.length === 0) return;
    if (unreadCapturedChannelRef.current === targetChannelId) return;

    const myUid = String(user.id);
    let lastMyReadIdx = -1;
    channelMessages.forEach((msg, idx) => {
      const isMine = String(msg.userId) === myUid;
      const hasMyReceipt = (msg.readReceipts || []).some(
        (r) => String(r.userId || r.user?.id || '') === myUid
      );
      if (isMine || hasMyReceipt) {
        lastMyReadIdx = idx;
      }
    });

    const firstUnread =
      lastMyReadIdx === -1 && (unreadCounts[targetChannelId] || 0) === 0
        ? null
        : channelMessages
            .slice(lastMyReadIdx + 1)
            .find((m) => String(m.userId) !== myUid);

    setFirstUnreadMessageId(firstUnread ? firstUnread.id : null);
    unreadCapturedChannelRef.current = targetChannelId;
  }, [targetChannelId, channelMessages, user?.id, unreadCounts]);

  // Read receipts: Mark as read when viewing new messages
  const lastChannelMsgId = channelMessages.length > 0 ? channelMessages[channelMessages.length - 1]?.id : null;
  useEffect(() => {
    if (lastChannelMsgId && !lastChannelMsgId.startsWith('temp_')) {
      markChannelAsRead(channelId || activeChannel?.id, lastChannelMsgId);
    }
  }, [lastChannelMsgId, channelId, activeChannel?.id]);

  // Compute reply counts for each parent message
  const replyCounts = useMemo(() => {
    const counts = {};
    messages.forEach((m) => {
      if (m.parentId) {
        counts[m.parentId] = (counts[m.parentId] || 0) + 1;
      }
    });
    return counts;
  }, [messages]);

  // Auto scroll to bottom when messages update, or show pill if scrolled up
  useEffect(() => {
    if (channelMessages.length > 0) {
      const lastMsg = channelMessages[channelMessages.length - 1];
      const isMine = lastMsg?.userId === user?.id;

      if (isNearBottomRef.current || isMine) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        setShowScrollBottom(true);
      }
    }
  }, [channelMessages.length, user?.id]);

  // Typing users string for this channel
  const typingList = Object.keys(typingUsers);
  const isSomeoneTyping = typingList.length > 0;
  const typingText = typingList.length === 1
    ? `${typingList[0]} đang gõ...`
    : `${typingList.slice(0, 2).join(', ')} đang gõ...`;

  const handleSend = useCallback((content, options = {}) => {
    if (editingMessage) {
      editMessage(editingMessage.id, content);
      setEditingMessage(null);
    } else {
      sendMessage(content, {
        ...options,
        parentId: options.parentId || null,
      });
      setReplyingMessage(null);
    }
  }, [editingMessage, editMessage, sendMessage]);

  // Ensure socket is joined to this channel room upon screen mount
  useEffect(() => {
    const targetChannelId = channelId || activeChannel?.id;
    if (targetChannelId) {
      socketService.joinChannel(targetChannelId);
    }
  }, [channelId, activeChannel?.id]);

  const handleTyping = useCallback(() => {
    socketService.sendTyping(channelId || activeChannel?.id, user?.name || user?.username);
  }, [channelId, activeChannel?.id, user?.name, user?.username]);

  const handleStopTyping = useCallback(() => {
    socketService.sendStopTyping(channelId || activeChannel?.id, user?.name || user?.username);
  }, [channelId, activeChannel?.id, user?.name, user?.username]);

  const handleLongPress = (msg) => {
    setSelectedMessage(msg);
    setShowReactionModal(true);
  };

  const handleReact = (messageId, emoji) => {
    toggleReaction(messageId, emoji);
  };

  const handleReplyThread = (msg) => {
    openThread(msg);
    navigation.navigate('Thread', {
      parentMessage: msg,
      channelName: channelName || activeChannel?.name,
    });
  };

  const handleQuoteReply = (msg) => {
    setReplyingMessage(msg);
    setShowReactionModal(false);
  };

  const handleEdit = (msg) => {
    setEditingMessage(msg);
  };

  const handleTogglePin = async (msg) => {
    try {
      await togglePinMessage(msg.id);
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể ghim/bỏ ghim');
    }
  };

  const handleToggleSave = async (msg) => {
    try {
      const res = await toggleSaveMessage(msg.id);
      Alert.alert('Mục đã lưu', res.saved ? 'Đã lưu tin nhắn vào mục Đã lưu!' : 'Đã xóa tin nhắn khỏi mục Đã lưu.');
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu tin nhắn');
    }
  };

  const handleDelete = (messageId) => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này khỏi kênh?') : true;
      if (confirmed) {
        deleteMessage(messageId);
      }
      return;
    }
    Alert.alert(
      'Xóa tin nhắn',
      'Bạn có chắc chắn muốn xóa tin nhắn này khỏi kênh?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: () => deleteMessage(messageId),
        },
      ]
    );
  };

  const rawChannelTitle = channelName || activeChannel?.name || 'general';
  const currentChannelTitle = isDirect && directPartner
    ? (directPartner.name || directPartner.username || rawChannelTitle)
    : (isDirect && rawChannelTitle.startsWith('DM_') ? 'Tin nhắn riêng' : rawChannelTitle);

  // Quick Starter Prompts for Welcome Card
  const handleQuickPrompt = (promptText) => {
    sendMessage(promptText);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      {/* 1. Header with Channel & Workspace Info */}
      <Header
        title={`${isDirect ? '@' : '#'}${currentChannelTitle}`}
        subtitle={isDirect ? 'Nhấn vào tên để xem hồ sơ' : `${activeWorkspace?.name || 'Workspace'} • ${activeChannel?.type === 'PRIVATE' ? 'Kênh bảo mật' : 'Kênh công khai'}`}
        icon={isDirect ? 'person' : (activeChannel?.type === 'PRIVATE' ? 'lock-closed' : 'chatbubbles')}
        onBack={() => navigation.goBack()}
        onTitlePress={isDirect && directPartner ? () => handleOpenUserProfile(directPartner) : undefined}
        rightActions={
          <View style={styles.headerRight}>
            {/* Search in Workspace Button */}
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => setShowSearchModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={19} color={THEME.text} />
            </TouchableOpacity>

            {/* Channel Info & Media Button */}
            {!isDirect && (
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() =>
                  navigation.navigate('ChannelDetails', {
                    channelId: channelId || activeChannel?.id,
                    channelName: currentChannelTitle,
                    channelType: activeChannel?.type,
                  })
                }
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={20} color={THEME.text} />
              </TouchableOpacity>
            )}

            {/* Pinned Messages in Channel Button */}
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => setShowPinnedModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="pin"
                size={18}
                color={pinnedMessages.length > 0 ? '#F59E0B' : THEME.textMuted}
              />
              {pinnedMessages.length > 0 && (
                <View style={styles.pinBadge}>
                  <Text style={styles.pinBadgeText}>{pinnedMessages.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.onlinePill}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Real-time</Text>
            </View>
          </View>
        }
      />

      {/* 1.5. Pinned Notice Bar */}
      {pinnedMessages.length > 0 && (
        <TouchableOpacity
          style={styles.pinnedNoticeBar}
          onPress={() => setShowPinnedModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.pinnedNoticeLeft}>
            <Ionicons name="pin" size={14} color="#F59E0B" />
            <Text style={styles.pinnedNoticeText} numberOfLines={1}>
              <Text style={styles.pinnedNoticeBold}>{pinnedMessages.length} tin nhắn đã ghim: </Text>
              {pinnedMessages[pinnedMessages.length - 1].content || '[Tệp đính kèm]'}
            </Text>
          </View>
          <View style={styles.pinnedNoticeAction}>
            <Text style={styles.pinnedNoticeActionText}>Xem tất cả</Text>
            <Ionicons name="chevron-forward" size={12} color="#F59E0B" />
          </View>
        </TouchableOpacity>
      )}

      {/* 2. Messages FlatList */}
      {isLoadingMessages ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Đang đồng bộ tin nhắn...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={channelMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={
            isLoadingMore ? (
              <View style={styles.topLoadingMore}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={styles.topLoadingText}>Đang tải tin nhắn cũ hơn...</Text>
              </View>
            ) : (!hasMoreMessages && channelMessages.length > 0 ? (
              <View style={styles.endOfHistoryCard}>
                <Ionicons name="sparkles" size={14} color={THEME.primary} />
                <Text style={styles.endOfHistoryText}>
                  Đây là phần đầu của kênh {isDirect ? '@' : '#'}{currentChannelTitle}
                </Text>
              </View>
            ) : null)
          }
          ListEmptyComponent={
            /* Modern Discord / Slack Caliber Channel Welcome Hero Card */
            <View style={styles.heroContainer}>
              <LinearGradient colors={['rgba(6, 182, 212, 0.15)', 'rgba(11, 14, 20, 0.4)']} style={styles.heroCard}>
                <View style={styles.heroIconBox}>
                  <LinearGradient colors={THEME.gradientPrimary} style={styles.heroIconGradient}>
                    <Text style={styles.heroIconHash}>{isDirect ? '@' : '#'}</Text>
                  </LinearGradient>
                </View>

                <View style={styles.heroBadge}>
                  <Ionicons name={isDirect ? 'person' : 'chatbubbles'} size={12} color={THEME.primary} />
                  <Text style={styles.heroBadgeText}>
                    {isDirect ? 'TIN NHẮN TRỰC TIẾP' : `KÊNH #${currentChannelTitle.toUpperCase()}`}
                  </Text>
                </View>

                <Text style={styles.heroTitle}>
                  {isDirect
                    ? `Cuộc trò chuyện với ${currentChannelTitle}`
                    : `Đây là điểm khởi đầu của #${currentChannelTitle}`}
                </Text>

                <Text style={styles.heroSubtitle}>
                  {isDirect
                    ? `Mọi tin nhắn và tài liệu gửi tại đây chỉ hiển thị giữa bạn và ${currentChannelTitle}.`
                    : `Kênh thảo luận chung của nhóm. Bạn có thể gửi tin nhắn, chia sẻ tài liệu hoặc @nhắc tên đồng nghiệp tại đây.`}
                </Text>

                {/* Quick Action Suggestion Chips */}
                <View style={styles.quickPromptsWrap}>
                  <Text style={styles.quickPromptsTitle}>GỢI Ý NHANH</Text>

                  <TouchableOpacity
                    style={styles.promptChip}
                    onPress={() =>
                      handleQuickPrompt(
                        isDirect
                          ? `Chào ${currentChannelTitle}, mình trao đổi chút việc nhé! 👋`
                          : `Chào mọi người trong #${currentChannelTitle}! 👋`
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={styles.promptChipEmoji}>👋</Text>
                    <Text style={styles.promptChipText}>
                      {isDirect ? 'Gửi lời chào' : 'Gửi lời chào cả nhóm'}
                    </Text>
                    <Ionicons name="send" size={12} color={THEME.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.promptChip}
                    onPress={() =>
                      handleQuickPrompt(
                        isDirect
                          ? `Mình gửi bạn cập nhật tiến độ phần việc hôm nay nhé.`
                          : `Cập nhật tiến độ công việc hôm nay cùng cả nhóm 🚀`
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={styles.promptChipEmoji}>🚀</Text>
                    <Text style={styles.promptChipText}>
                      {isDirect ? 'Trao đổi tiến độ công việc' : 'Cập nhật tiến độ dự án'}
                    </Text>
                    <Ionicons name="send" size={12} color={THEME.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.promptChip}
                    onPress={() =>
                      handleQuickPrompt(
                        isDirect
                          ? `Mình gửi bạn xem qua tài liệu này nhé.`
                          : `Tài liệu và biên bản họp đã sẵn sàng để mọi người xem qua. 📋`
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={styles.promptChipEmoji}>📋</Text>
                    <Text style={styles.promptChipText}>
                      {isDirect ? 'Gửi tài liệu trao đổi' : 'Chia sẻ tài liệu & biên bản họp'}
                    </Text>
                    <Ionicons name="send" size={12} color={THEME.primary} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          }
          renderItem={({ item, index }) => {
            const rawTime = item.createdAt || item.createAt;
            const prevMsg = index > 0 ? channelMessages[index - 1] : null;
            const prevRawTime = prevMsg ? (prevMsg.createdAt || prevMsg.createAt) : null;

            let showDateHeader = false;
            let dateHeaderText = '';
            if (index === 0 && rawTime) {
              showDateHeader = true;
              dateHeaderText = formatMessageDateHeader(rawTime);
            } else if (rawTime && prevRawTime) {
              const curDateStr = new Date(rawTime).toDateString();
              const prevDateStr = new Date(prevRawTime).toDateString();
              if (curDateStr !== prevDateStr) {
                showDateHeader = true;
                dateHeaderText = formatMessageDateHeader(rawTime);
              }
            }

            return (
              <View>
                {showDateHeader && (
                  <View style={styles.dateSeparatorRow}>
                    <View style={styles.dateSeparatorLine} />
                    <View style={styles.dateSeparatorBadge}>
                      <Ionicons name="calendar-outline" size={12} color={THEME.primaryLight} style={{ marginRight: 5 }} />
                      <Text style={styles.dateSeparatorText}>{dateHeaderText}</Text>
                    </View>
                    <View style={styles.dateSeparatorLine} />
                  </View>
                )}
                {firstUnreadMessageId && item.id === firstUnreadMessageId && (
                  <View style={styles.newMessagesSeparatorRow}>
                    <View style={styles.newMessagesLine} />
                    <View style={styles.newMessagesBadge}>
                      <Text style={styles.newMessagesText}>TIN NHẮN MỚI</Text>
                    </View>
                    <View style={styles.newMessagesLine} />
                  </View>
                )}
                <MessageBubble
                  message={item}
                  currentUserId={user?.id}
                  onLongPress={handleLongPress}
                  onReact={handleReact}
                  onOpenThread={handleReplyThread}
                  onPressImage={handleOpenImage}
                  onQuickReply={handleReplyThread}
                  onPressUser={handleOpenUserProfile}
                  onLongPressReaction={handleOpenReactionDetails}
                  customEmojis={customEmojis}
                  isOnline={onlineUsers.has(item.userId)}
                  userStatus={workspaceMembers.find(m => m.id === item.userId)?.status || item.user?.status}
                  threadReplyCount={replyCounts[item.id] || 0}
                  hasUnreadReplies={(unreadThreads[item.id] || 0) > 0}
                />
              </View>
            );
          }}
        />
      )}

      {/* Floating New Messages Pill Button */}
      {showScrollBottom && (
        <TouchableOpacity
          style={styles.floatingNewMsgPill}
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
            setShowScrollBottom(false);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down" size={14} color="#0B0E14" />
          <Text style={styles.floatingNewMsgText}>Tin nhắn mới bên dưới</Text>
        </TouchableOpacity>
      )}

      {/* 3. Realtime Typing Indicator */}
      {isSomeoneTyping && (
        <View style={styles.typingBar}>
          <View style={styles.typingDot} />
          <Text style={styles.typingText}>{typingText}</Text>
        </View>
      )}

      {/* 4. Modern Chat Input Bar */}
      <ChatInput
        onSend={handleSend}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        customEmojis={customEmojis}
        members={workspaceMembers}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        replyingParent={replyingMessage}
        onCancelReply={() => setReplyingMessage(null)}
        placeholder={isDirect ? `Nhắn tin cho @${currentChannelTitle}...` : `Nhắn tin trong #${currentChannelTitle}...`}
        onAddCustomEmoji={() => setShowUploadEmojiModal(true)}
      />

      {/* 5. Reaction & Action Sheet Modal */}
      <ReactionPickerModal
        visible={showReactionModal}
        onClose={() => setShowReactionModal(false)}
        message={selectedMessage}
        currentUserId={user?.id || user?._id}
        isAdmin={isWorkspaceAdmin || isChannelAdmin}
        onReact={handleReact}
        onReplyThread={handleReplyThread}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onQuoteReply={handleQuoteReply}
        onTogglePin={handleTogglePin}
        onToggleSave={handleToggleSave}
        isSaved={savedMessages.some((sm) => sm.id === selectedMessage?.id)}
        customEmojis={customEmojis}
        onAddCustomEmoji={() => setShowUploadEmojiModal(true)}
      />

      {/* 6. Pinned Messages Modal */}
      <PinnedMessagesModal
        visible={showPinnedModal}
        onClose={() => setShowPinnedModal(false)}
        channelName={currentChannelTitle}
        pinnedMessages={pinnedMessages}
        onUnpin={(msgId) => togglePinMessage(msgId)}
      />

      {/* 7. Search Messages Modal */}
      <SearchMessagesModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        workspaceId={activeWorkspace?.id}
        workspaceName={activeWorkspace?.name}
        onSelectResult={(item) => {
          if (item.channelId && item.channelId !== activeChannel?.id) {
            const ch = channels.find((c) => c.id === item.channelId) || {
              id: item.channelId,
              name: item.channel?.name || 'kênh',
              type: item.channel?.type || 'PUBLIC',
            };
            setActiveChannel(ch);
          }
        }}
      />
      {/* 8. Full-screen Media Lightbox Modal */}
      <MediaViewerModal
        visible={!!viewerImage}
        imageUrl={viewerImage?.imageUrl}
        senderName={viewerImage?.senderName}
        createdAt={viewerImage?.createdAt}
        onClose={() => setViewerImage(null)}
      />

      {/* 9. Upload Custom Emoji Modal */}
      <UploadCustomEmojiModal
        visible={showUploadEmojiModal}
        onClose={() => setShowUploadEmojiModal(false)}
      />

      {/* 10. Read Receipts List Modal */}
      <ReadReceiptsModal
        visible={!!readReceiptsModalData}
        receipts={readReceiptsModalData || []}
        onlineUsers={onlineUsers}
        onClose={() => setReadReceiptsModalData(null)}
        onSelectUser={handleOpenUserProfile}
      />

      {/* 11. Public User Profile Modal */}
      <UserProfileModal
        visible={!!profileUser}
        user={profileUser}
        isOnline={profileUser ? onlineUsers.has(profileUser.id) : false}
        currentUserId={user?.id}
        showDirectMessageBtn={!isDirect}
        onSendMessage={handleStartDirectChat}
        onClose={() => setProfileUser(null)}
      />

      {/* 12. Reaction Details Modal */}
      <ReactionDetailsModal
        visible={!!reactionDetailsData}
        reactions={reactionDetailsData?.reactions || []}
        initialEmoji={reactionDetailsData?.initialEmoji}
        customEmojis={customEmojis}
        onlineUsers={onlineUsers}
        onSelectUser={handleOpenUserProfile}
        onClose={() => setReactionDetailsData(null)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  floatingNewMsgPill: {
    position: 'absolute',
    bottom: 68,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    zIndex: 99,
    elevation: 6,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  floatingNewMsgText: {
    color: '#0B0E14',
    fontSize: 12,
    fontWeight: '800',
  },
  topLoadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  topLoadingText: {
    color: THEME.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  endOfHistoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
    marginBottom: 12,
  },
  endOfHistoryText: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    position: 'relative',
  },
  pinBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  pinBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0B0E14',
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.success,
    letterSpacing: 0.3,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: THEME.textDim,
    fontSize: 13,
    marginTop: 10,
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  /* Hero Welcome Card Styles */
  heroContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    marginTop: 20,
  },
  heroCard: {
    borderRadius: THEME.radiusLg,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    padding: 20,
    alignItems: 'flex-start',
  },
  heroIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  heroIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconHash: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0B0E14',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    lineHeight: 20,
    marginBottom: 18,
  },
  quickPromptsWrap: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
    gap: 8,
  },
  quickPromptsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textDim,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  promptChipEmoji: {
    fontSize: 16,
  },
  promptChipText: {
    flex: 1,
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 6,
    backgroundColor: THEME.surface,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  typingText: {
    fontSize: 11,
    color: THEME.primaryLight,
    fontStyle: 'italic',
  },
  pinnedNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pinnedNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  pinnedNoticeText: {
    fontSize: 12,
    color: THEME.text,
    flex: 1,
  },
  pinnedNoticeBold: {
    fontWeight: '800',
    color: '#F59E0B',
  },
  pinnedNoticeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pinnedNoticeActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  dateSeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateSeparatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primaryLight,
    letterSpacing: 0.3,
  },
  newMessagesSeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  newMessagesLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(239, 68, 68, 0.55)',
  },
  newMessagesBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newMessagesText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F87171',
    letterSpacing: 0.8,
  },
});
