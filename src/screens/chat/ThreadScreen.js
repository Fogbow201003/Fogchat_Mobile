import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { MessageBubble } from '../../components/MessageBubble';
import { ChatInput } from '../../components/ChatInput';
import { ReactionPickerModal } from '../../components/ReactionPickerModal';
import { MediaViewerModal } from '../../components/modals/MediaViewerModal';
import { ReadReceiptsModal } from '../../components/modals/ReadReceiptsModal';
import { UserProfileModal } from '../../components/modals/UserProfileModal';
import { ReactionDetailsModal } from '../../components/modals/ReactionDetailsModal';
import { UploadCustomEmojiModal } from '../modals/UploadCustomEmojiModal';
import { socketService } from '../../services/socket';

export const ThreadScreen = ({ route, navigation }) => {
  const { parentMessage, channelName } = route.params || {};
  const { user } = useAuth();
  const {
    activeChannel,
    messages,
    sendMessage,
    toggleReaction,
    deleteMessage,
    editMessage,
    customEmojis,
    onlineUsers,
    threadTypingUsers = {},
    clearUnreadThread,
    markChannelAsRead,
    workspaceMembers,
    isWorkspaceAdmin,
    isChannelAdmin,
    toggleSaveMessage,
    savedMessages = [],
    openDirectChat,
  } = useChat();

  const handleTyping = useCallback(() => {
    const chId = activeChannel?.id || parentMessage?.channelId;
    if (chId) socketService.sendTyping(chId, user?.name || user?.username, parentMessage?.id);
  }, [activeChannel?.id, parentMessage?.channelId, parentMessage?.id, user?.name, user?.username]);

  const handleStopTyping = useCallback(() => {
    const chId = activeChannel?.id || parentMessage?.channelId;
    if (chId) socketService.sendStopTyping(chId, user?.name || user?.username, parentMessage?.id);
  }, [activeChannel?.id, parentMessage?.channelId, parentMessage?.id, user?.name, user?.username]);

  const threadTypingList = Object.keys(threadTypingUsers[parentMessage?.id] || {});
  const liveParentMessage = messages.find((m) => m.id === parentMessage?.id) || parentMessage;

  useEffect(() => {
    if (parentMessage?.id) {
      clearUnreadThread(parentMessage.id);
    }
  }, [parentMessage?.id]);

  const flatListRef = useRef(null);
  const [viewerImage, setViewerImage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [readReceiptsModalData, setReadReceiptsModalData] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [reactionDetailsData, setReactionDetailsData] = useState(null);

  const handleOpenReactionDetails = useCallback((reactions, emoji) => {
    if (reactions && reactions.length > 0) {
      setReactionDetailsData({ reactions, initialEmoji: emoji });
    }
  }, []);

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
          navigation.navigate('ChatRoom', {
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
  const [showUploadEmojiModal, setShowUploadEmojiModal] = useState(false);

  const handleOpenImage = (imageUrl, senderName, createdAt) => {
    setViewerImage({ imageUrl, senderName, createdAt });
  };

  // Get all replies for this parent message
  const replies = messages.filter((m) => m.parentId === parentMessage?.id);

  // Auto scroll to bottom when new reply arrives
  useEffect(() => {
    if (replies.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [replies.length]);

  const handleSendReply = useCallback((content, options = {}) => {
    if (editingMessage) {
      editMessage(editingMessage.id, content);
      setEditingMessage(null);
    } else {
      sendMessage(content, { ...options, parentId: parentMessage.id });
    }
  }, [editingMessage, editMessage, sendMessage, parentMessage?.id]);

  const handleLongPress = (msg) => {
    setSelectedMessage(msg);
    setShowReactionModal(true);
  };

  const handleReact = (messageId, emoji) => {
    toggleReaction(messageId, emoji);
  };

  const handleEdit = (msg) => {
    setEditingMessage(msg);
  };

  // Đánh dấu đã xem đến phản hồi mới nhất trong luồng
  useEffect(() => {
    const chId = activeChannel?.id || parentMessage?.channelId;
    if (!chId || replies.length === 0) return;
    const latestReply = replies[replies.length - 1];
    if (latestReply?.id && latestReply.userId !== user?.id) {
      markChannelAsRead(chId, latestReply.id);
    }
  }, [replies.length, activeChannel?.id, parentMessage?.channelId, user?.id, markChannelAsRead]);

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
      const confirmed = typeof window !== 'undefined' ? window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này khỏi luồng?') : true;
      if (confirmed) {
        deleteMessage(messageId);
      }
      return;
    }
    Alert.alert(
      'Xóa tin nhắn',
      'Bạn có chắc chắn muốn xóa tin nhắn này khỏi luồng thảo luận?',
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      {/* 1. Header */}
      <Header
        title="Thảo luận"
        subtitle={channelName ? `#${channelName.replace(/^#/, '')}` : undefined}
        icon="chatbubbles"
        onBack={() => navigation.goBack()}
      />

      {/* 2. Parent Message & Replies List */}
      <FlatList
        ref={flatListRef}
        data={replies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
        ListHeaderComponent={
          <View style={styles.parentBox}>
            <MessageBubble
              message={liveParentMessage}
              currentUserId={user?.id}
              onLongPress={handleLongPress}
              onReact={handleReact}
              onPressImage={handleOpenImage}
              onPressUser={handleOpenUserProfile}
              onPressReadReceipts={handleOpenReadReceipts}
              onLongPressReaction={handleOpenReactionDetails}
              customEmojis={customEmojis}
              isOnline={onlineUsers.has(liveParentMessage?.userId)}
              threadReplyCount={0}
            />

            <View style={styles.threadDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {replies.length} phản hồi
              </Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              Chưa có phản hồi nào.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <MessageBubble
            message={{ ...item, parent: null }}
            currentUserId={user?.id}
            onLongPress={handleLongPress}
            onReact={handleReact}
            onPressImage={handleOpenImage}
            onPressUser={handleOpenUserProfile}
            onPressReadReceipts={handleOpenReadReceipts}
            onLongPressReaction={handleOpenReactionDetails}
            customEmojis={customEmojis}
            isOnline={onlineUsers.has(item.userId)}
            threadReplyCount={0}
            readBy={item.readReceipts || []}
          />
        )}
      />

      {/* Typing Indicator */}
      {threadTypingList.length > 0 && (
        <View style={styles.typingBar}>
          <Text style={styles.typingText} numberOfLines={1}>
            {threadTypingList.join(', ')} đang nhập...
          </Text>
        </View>
      )}

      {/* 3. Reply Input */}
      <ChatInput
        onSend={handleSendReply}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        customEmojis={customEmojis}
        members={workspaceMembers}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        placeholder="Trả lời..."
        onAddCustomEmoji={() => setShowUploadEmojiModal(true)}
      />

      {/* 4. Full-screen Media Viewer */}
      <MediaViewerModal
        visible={!!viewerImage}
        imageUrl={viewerImage?.imageUrl}
        senderName={viewerImage?.senderName}
        createdAt={viewerImage?.createdAt}
        onClose={() => setViewerImage(null)}
      />

      {/* 5. Reaction & Action Sheet Modal */}
      <ReactionPickerModal
        visible={showReactionModal}
        onClose={() => setShowReactionModal(false)}
        message={selectedMessage}
        currentUserId={user?.id || user?._id}
        isAdmin={isWorkspaceAdmin || isChannelAdmin}
        onReact={handleReact}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleSave={handleToggleSave}
        isSaved={savedMessages.some(s => s.messageId === selectedMessage?.id || s.id === selectedMessage?.id)}
        customEmojis={customEmojis}
        onAddCustomEmoji={() => setShowUploadEmojiModal(true)}
      />

      {/* 6. Upload Custom Emoji Modal */}
      <UploadCustomEmojiModal
        visible={showUploadEmojiModal}
        onClose={() => setShowUploadEmojiModal(false)}
      />

      {/* 7. Read Receipts List Modal */}
      <ReadReceiptsModal
        visible={!!readReceiptsModalData}
        receipts={readReceiptsModalData || []}
        onlineUsers={onlineUsers}
        onClose={() => setReadReceiptsModalData(null)}
        onSelectUser={handleOpenUserProfile}
      />

      {/* 8. Public User Profile Modal */}
      <UserProfileModal
        visible={!!profileUser}
        user={profileUser}
        isOnline={profileUser ? onlineUsers.has(profileUser.id) : false}
        currentUserId={user?.id}
        showDirectMessageBtn={activeChannel?.type !== 'DIRECT'}
        onSendMessage={handleStartDirectChat}
        onClose={() => setProfileUser(null)}
      />

      {/* 9. Reaction Details Modal */}
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
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  listContent: {
    paddingVertical: 12,
  },
  parentBox: {
    marginBottom: 8,
  },
  parentHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  parentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.8,
  },
  threadDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textDim,
    letterSpacing: 0.8,
  },
  emptyWrap: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: THEME.textDim,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  typingBar: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    backgroundColor: THEME.background,
  },
  typingText: {
    fontSize: 12,
    color: THEME.primaryLight,
    fontStyle: 'italic',
  },
});
