import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { workspaceApi, channelApi, messageApi, emojiApi, uploadApi } from '../services/api';
import { socketService } from '../services/socket';
import { storage } from '../services/storage';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { token, user, isAuthenticated } = useAuth();

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [threadTypingUsers, setThreadTypingUsers] = useState({});
  const [customEmojis, setCustomEmojis] = useState([]);

  // Saved / Bookmarked messages
  const [savedMessages, setSavedMessages] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Active thread discussion
  const [activeThreadParent, setActiveThreadParent] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Unread message & In-app notifications
  const [unreadCounts, setUnreadCounts] = useState({}); // { [channelId]: count }
  const [unreadThreads, setUnreadThreads] = useState({}); // { [parentId]: count }
  const [inAppNotification, setInAppNotification] = useState(null);

  // 1. Fetch workspaces when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setIsLoadingWorkspaces(false);
      setChannels([]);
      setActiveChannel(null);
      setMessages([]);
      return;
    }

    const loadWorkspaces = async () => {
      setIsLoadingWorkspaces(true);
      try {
        const data = await workspaceApi.getWorkspaces();
        const wsList = Array.isArray(data) ? data : (data.data || data.workspaces || []);
        setWorkspaces(wsList);

        if (wsList.length > 0) {
          const storedWsId = await storage.getActiveWorkspaceId();
          const found = wsList.find(w => w.id === storedWsId) || wsList[0];
          setActiveWorkspace(found);
        }
      } catch (err) {
        console.error('loadWorkspaces error:', err);
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    loadWorkspaces();
  }, [isAuthenticated]);

  // 2. Fetch channels & custom emojis when activeWorkspace changes
  useEffect(() => {
    if (!activeWorkspace) return;

    storage.setActiveWorkspaceId(activeWorkspace.id);

    const loadChannelsAndEmojis = async () => {
      try {
        const channelsData = await channelApi.getChannels(activeWorkspace.id);
        const chList = Array.isArray(channelsData) ? channelsData : (channelsData.data || channelsData.channels || []);
        setChannels(chList);
        const initialUnread = {};
        chList.forEach(ch => {
          if (ch?.id && ch.unreadCount > 0) {
            initialUnread[ch.id] = ch.unreadCount;
          }
        });
        setUnreadCounts(initialUnread);
        // Join socket room của tất cả kênh (PUBLIC, PRIVATE, DIRECT) để nhận thông báo tin nhắn mới tức thì
        chList.forEach(ch => {
          if (ch?.id) socketService.joinChannel(ch.id);
        });

        // Fetch custom emojis
        try {
          const emojiData = await emojiApi.getEmojis(activeWorkspace.id);
          const emojis = emojiData.custom || emojiData.data || emojiData || [];
          setCustomEmojis(emojis);
        } catch (e) {
          console.warn('Could not load custom emojis:', e.message);
        }

        // Fetch workspace members for @mention
        try {
          const membersData = await workspaceApi.getWorkspaceMembers(activeWorkspace.id);
          const mList = Array.isArray(membersData) ? membersData : (membersData.data || membersData.members || []);
          const memberUsers = mList.map(m => m.user || m).filter(Boolean);
          setWorkspaceMembers(memberUsers);
        } catch (e) {
          console.warn('Could not load workspace members:', e.message);
        }

      } catch (err) {
        console.error('loadChannels error:', err);
      }
    };

    loadChannelsAndEmojis();
  }, [activeWorkspace]);

  // 3. Join channel room & fetch messages when activeChannel changes
  useEffect(() => {
    if (!activeChannel) {
      setMessages([]);
      return;
    }

    // Join socket room
    socketService.joinChannel(activeChannel.id);

    // Fetch messages
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      setHasMoreMessages(true);
      try {
        const data = await channelApi.getMessages(activeChannel.id, { limit: 30 });
        const msgList = Array.isArray(data) ? data : (data.data || data.messages || []);
        // Sort chronologically (oldest at top, newest at bottom)
        const sorted = [...msgList].sort((a, b) => new Date(a.createdAt || a.createAt) - new Date(b.createdAt || b.createAt));
        setMessages(sorted);
        if (data.hasMore !== undefined) {
          setHasMoreMessages(data.hasMore);
        } else {
          setHasMoreMessages(msgList.length >= 30);
        }
      } catch (err) {
        console.error('fetchMessages error:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeChannel?.id]);

  // 4. Setup Real-time Socket Event Listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // A. Receive Message
    const handleReceiveMessage = (newMessage) => {
      if (!newMessage) return;
      const isMine = newMessage.userId === user?.id;

      // 1. If it belongs to currently active channel, update message state
      if (activeChannel && newMessage.channelId === activeChannel.id) {
        setMessages(prev => {
          const tempIndex = prev.findIndex(
            m => m.id?.startsWith('temp_') && m.userId === newMessage.userId && (m.content === newMessage.content || (m.fileUrl && newMessage.fileUrl))
          );
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = newMessage;
            return updated;
          }
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }

      // 2. If active thread parent is open, update thread replies
      if (activeThreadParent && (newMessage.parentId === activeThreadParent.id || newMessage.id === activeThreadParent.id)) {
        setThreadReplies(prev => {
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }

      // 3. Track unread & surface in-app banner for incoming messages from others
      if (!isMine) {
        const sender = newMessage.user || {};
        const senderName = sender.name || sender.username || 'Đồng nghiệp';
        const targetChannel = channels.find(c => c.id === newMessage.channelId) || newMessage.channel;
        const isDirect = targetChannel?.type === 'DIRECT' || newMessage.channelType === 'DIRECT';
        const chTitle = targetChannel?.name || (isDirect ? senderName : 'kênh');
        const preview = newMessage.content || (newMessage.fileUrl ? (newMessage.fileUrl.endsWith('.pdf') ? '📄 Đã gửi tài liệu PDF' : '📷 Đã gửi một hình ảnh') : 'Tin nhắn mới');

        // Nếu là DM mới mà client chưa có trong danh sách channels -> tự thêm vào & join room
        if (newMessage.channel && !channels.some(c => c.id === newMessage.channelId)) {
          const dmWithMember = {
            ...newMessage.channel,
            members: newMessage.channel.members || (sender?.id ? [{ userId: sender.id, user: sender }] : []),
          };
          setChannels(prev => (prev.some(c => c.id === newMessage.channelId) ? prev : [...prev, dmWithMember]));
          socketService.joinChannel(newMessage.channelId);
        }

        // Track unread thread reply regardless of whether user is inside or outside the channel
        if (newMessage.parentId && (!activeThreadParent || activeThreadParent.id !== newMessage.parentId)) {
          setUnreadThreads(prev => ({
            ...prev,
            [newMessage.parentId]: (prev[newMessage.parentId] || 0) + 1,
          }));
        }

        // Condition A: Message is in another channel (or when user is not viewing this channel)
        if (!activeChannel || newMessage.channelId !== activeChannel.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [newMessage.channelId]: (prev[newMessage.channelId] || 0) + 1,
          }));

          if (user?.status !== 'DND') {
            setInAppNotification({
              id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              type: isDirect ? 'dm' : 'channel',
              title: isDirect ? senderName : `#${chTitle}`,
              subtitle: isDirect ? 'Tin nhắn riêng mới' : `Tin mới trong #${chTitle}`,
              body: `${senderName}: ${preview}`,
              avatarUrl: sender.avatarUrl,
              channelId: newMessage.channelId,
              channel: targetChannel,
              message: newMessage,
            });
          }
        }
        // Condition B: Thread reply in current channel, but thread screen is NOT currently open
        else if (newMessage.parentId && (!activeThreadParent || activeThreadParent.id !== newMessage.parentId)) {
          if (user?.status !== 'DND') {
            setInAppNotification({
              id: `notif_thread_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              type: 'thread',
              title: `Luồng thảo luận #${chTitle}`,
              subtitle: 'Có câu trả lời mới trong luồng',
              body: `${senderName}: ${preview}`,
              avatarUrl: sender.avatarUrl,
              channelId: newMessage.channelId,
              parentId: newMessage.parentId,
              parentMessage: newMessage.parent || null,
              channel: activeChannel,
              message: newMessage,
            });
          }
        }

        // Desktop notification for web
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
          try {
            new Notification(`FogChat: ${senderName} (${chTitle})`, {
              body: preview,
              icon: sender.avatarUrl || '/favicon.ico',
            });
          } catch (e) {}
        }
      }
    };

    // B. User Typing (tách riêng kênh chính và luồng thread)
    const handleUserTyping = (data) => {
      const username = data?.username || data;
      const typingChannelId = data?.channelId;
      const typingParentId = data?.parentId || null;

      if (!username) return;
      const myUsername = user?.username?.toLowerCase();
      const myName = user?.name?.toLowerCase();
      const incomingName = (typeof username === 'string' ? username : '')?.toLowerCase();

      // Don't show typing for self
      if (incomingName === myUsername || incomingName === myName) return;

      // Filter by channel if provided
      if (typingChannelId && activeChannel?.id && typingChannelId !== activeChannel.id) return;

      if (typingParentId) {
        setThreadTypingUsers(prev => ({
          ...prev,
          [typingParentId]: {
            ...(prev[typingParentId] || {}),
            [username]: Date.now(),
          },
        }));
      } else {
        setTypingUsers(prev => ({
          ...prev,
          [username]: Date.now()
        }));
      }
    };

    const handleUserStoppedTyping = (data) => {
      const username = data?.username || data;
      const typingParentId = data?.parentId || null;
      if (!username) return;

      if (typingParentId) {
        setThreadTypingUsers(prev => {
          const currentThread = prev[typingParentId];
          if (!currentThread || !(username in currentThread)) return prev;
          const copyThread = { ...currentThread };
          delete copyThread[username];
          return { ...prev, [typingParentId]: copyThread };
        });
      } else {
        setTypingUsers(prev => {
          const copy = { ...prev };
          delete copy[username];
          return copy;
        });
      }
    };

    // C. Reaction Updated
    const handleReactionUpdated = (data) => {
      // data: { messageId, reactions }
      if (!data?.messageId) return;
      setMessages(prev =>
        prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m)
      );
      setActiveThreadParent(prev =>
        prev && prev.id === data.messageId ? { ...prev, reactions: data.reactions } : prev
      );
      if (activeThreadParent) {
        setThreadReplies(prev =>
          prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m)
        );
      }
    };

    // D. Message Edited Real-time
    const handleMessageEdited = (updatedMsg) => {
      if (!updatedMsg?.id) return;
      setMessages(prev =>
        prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m)
      );
      if (activeThreadParent) {
        setThreadReplies(prev =>
          prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m)
        );
      }
    };

    // E. Message Pinned Toggled Real-time
    const handleMessagePinnedToggled = (updatedMessage) => {
      if (!updatedMessage?.id) return;
      setMessages(prev =>
        prev.map(m => m.id === updatedMessage.id ? { ...m, isPinned: updatedMessage.isPinned } : m)
      );
    };

    // F. Read Receipts Real-time (di chuyển avatar đã xem xuống tin nhắn mới nhất người đó vừa đọc)
    const handleMessagesRead = (readReceipt) => {
      if (!readReceipt?.messageId) return;
      setMessages(prev =>
        prev.map(m => {
          if (m.id === readReceipt.messageId) {
            const currentReceipts = m.readReceipts || [];
            const exists = currentReceipts.some(r => r.userId === readReceipt.userId);
            const nextReceipts = exists
              ? currentReceipts.map(r => r.userId === readReceipt.userId ? readReceipt : r)
              : [...currentReceipts, readReceipt];
            return { ...m, readReceipts: nextReceipts };
          }
          if (
            (!readReceipt.channelId || m.channelId === readReceipt.channelId) &&
            Array.isArray(m.readReceipts) &&
            m.readReceipts.some(r => r.userId === readReceipt.userId)
          ) {
            return {
              ...m,
              readReceipts: m.readReceipts.filter(r => r.userId !== readReceipt.userId),
            };
          }
          return m;
        })
      );
    };

    // G. User Profile Updated Real-time
    const handleUserProfileUpdated = (profile) => {
      if (!profile?.userId) return;
      setWorkspaceMembers(prev =>
        prev.map(m => m.id === profile.userId ? {
          ...m,
          name: profile.name !== undefined ? profile.name : m.name,
          avatarUrl: profile.avatarUrl !== undefined ? profile.avatarUrl : m.avatarUrl,
          title: profile.title !== undefined ? profile.title : m.title,
          status: profile.status !== undefined ? profile.status : m.status,
          customStatus: profile.customStatus !== undefined ? profile.customStatus : m.customStatus,
        } : m)
      );
      setMessages(prev =>
        prev.map(m => m.userId === profile.userId ? {
          ...m,
          user: {
            ...m.user,
            name: profile.name !== undefined ? profile.name : m.user?.name,
            avatarUrl: profile.avatarUrl !== undefined ? profile.avatarUrl : m.user?.avatarUrl,
            status: profile.status !== undefined ? profile.status : m.user?.status,
            customStatus: profile.customStatus !== undefined ? profile.customStatus : m.user?.customStatus,
          }
        } : m)
      );
    };

    // G2. Channel Updated Real-time
    const handleChannelUpdated = (updatedChan) => {
      if (!updatedChan?.id) return;
      setChannels(prev => prev.map(c => c.id === updatedChan.id ? { ...c, ...updatedChan } : c));
      setActiveChannel(prev => prev?.id === updatedChan.id ? { ...prev, ...updatedChan } : prev);
    };

    // H. Member Joined Workspace Real-time
    const handleMemberJoinedWorkspace = (data) => {
      if (!data?.workspaceId) return;
      if (activeWorkspace && activeWorkspace.id === data.workspaceId) {
        if (data.user) {
          setWorkspaceMembers(prev => {
            if (prev.some(u => u.id === data.user.id)) return prev;
            return [...prev, data.user];
          });
        }
      }
    };

    // I. Message Deleted
    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setThreadReplies(prev => prev.filter(m => m.id !== messageId));
    };

    // J. Presence: Online users
    const handleOnlineUsersList = (usersList) => {
      setOnlineUsers(new Set(usersList));
    };

    const handleUserOnline = (userId) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    };

    const handleUserOffline = (userId) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    const handleMemberRoleUpdated = ({ userId, role }) => {
      setWorkspaceMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m));
    };

    const handleMemberRemoved = ({ userId }) => {
      setWorkspaceMembers(prev => prev.filter(m => m.id !== userId));
    };

    // L. Custom Emoji Sync Across Workspaces
    const handleCustomEmojiAdded = (newEmoji) => {
      if (!newEmoji?.id) return;
      setCustomEmojis(prev => {
        if (prev.some(e => e.id === newEmoji.id || e.shortcode === newEmoji.shortcode)) return prev;
        return [newEmoji, ...prev];
      });
    };

    const handleCustomEmojiDeleted = ({ emojiId }) => {
      if (!emojiId) return;
      setCustomEmojis(prev => prev.filter(e => e.id !== emojiId));
    };

    // M. Invited / Added to a new Channel (e.g. Private channel)
    const handleNewChannelCreated = (newChannel) => {
      if (!newChannel?.id) return;
      if (!activeWorkspace?.id || newChannel.workspaceId === activeWorkspace.id) {
        setChannels(prev => (prev.some(c => c.id === newChannel.id) ? prev : [...prev, newChannel]));
        socketService.joinChannel(newChannel.id);
        if (newChannel.createdById !== user?.id) {
          setInAppNotification({
            id: `notif_chan_${Date.now()}`,
            type: 'channel',
            title: `#${newChannel.name}`,
            subtitle: 'Bạn vừa được thêm vào kênh mới',
            body: `Nhấn để mở kênh #${newChannel.name}`,
            channelId: newChannel.id,
            channel: newChannel,
          });
        }
      }
    };

    // N. Added directly to a Workspace by Admin
    const handleWorkspaceAdded = (newWs) => {
      if (!newWs?.id) return;
      setWorkspaces(prev => (prev.some(w => w.id === newWs.id) ? prev : [...prev, newWs]));
      setInAppNotification({
        id: `notif_ws_${Date.now()}`,
        type: 'channel',
        title: newWs.name || 'Không gian mới',
        subtitle: 'Bạn vừa được thêm vào Workspace',
        body: `Mở danh sách Workspace để chuyển sang "${newWs.name}"`,
      });
    };

    socketService.on('receive_message', handleReceiveMessage);
    socketService.on('user_typing', handleUserTyping);
    socketService.on('user_stopped_typing', handleUserStoppedTyping);
    socketService.on('reaction_updated', handleReactionUpdated);
    socketService.on('update_reaction', handleReactionUpdated);
    socketService.on('message_edited', handleMessageEdited);
    socketService.on('message_pinned_toggled', handleMessagePinnedToggled);
    socketService.on('messages_read', handleMessagesRead);
    socketService.on('user_profile_updated', handleUserProfileUpdated);
    socketService.on('channel_updated', handleChannelUpdated);
    socketService.on('member_joined_workspace', handleMemberJoinedWorkspace);
    socketService.on('member_role_updated', handleMemberRoleUpdated);
    socketService.on('member_removed', handleMemberRemoved);
    socketService.on('message_deleted', handleMessageDeleted);
    socketService.on('online_users_list', handleOnlineUsersList);
    socketService.on('user_online', handleUserOnline);
    socketService.on('user_offline', handleUserOffline);
    socketService.on('custom_emoji_added', handleCustomEmojiAdded);
    socketService.on('custom_emoji_deleted', handleCustomEmojiDeleted);
    socketService.on('new_channel_created', handleNewChannelCreated);
    socketService.on('workspace_added', handleWorkspaceAdded);
    socketService.socket?.emit('get_online_users');

    return () => {
      socketService.off('receive_message', handleReceiveMessage);
      socketService.off('user_typing', handleUserTyping);
      socketService.off('user_stopped_typing', handleUserStoppedTyping);
      socketService.off('reaction_updated', handleReactionUpdated);
      socketService.off('update_reaction', handleReactionUpdated);
      socketService.off('message_edited', handleMessageEdited);
      socketService.off('message_pinned_toggled', handleMessagePinnedToggled);
      socketService.off('messages_read', handleMessagesRead);
      socketService.off('user_profile_updated', handleUserProfileUpdated);
      socketService.off('channel_updated', handleChannelUpdated);
      socketService.off('member_joined_workspace', handleMemberJoinedWorkspace);
      socketService.off('member_role_updated', handleMemberRoleUpdated);
      socketService.off('member_removed', handleMemberRemoved);
      socketService.off('message_deleted', handleMessageDeleted);
      socketService.off('online_users_list', handleOnlineUsersList);
      socketService.off('user_online', handleUserOnline);
      socketService.off('user_offline', handleUserOffline);
      socketService.off('custom_emoji_added', handleCustomEmojiAdded);
      socketService.off('custom_emoji_deleted', handleCustomEmojiDeleted);
      socketService.off('new_channel_created', handleNewChannelCreated);
      socketService.off('workspace_added', handleWorkspaceAdded);
    };
  }, [isAuthenticated, activeWorkspace?.id, activeChannel?.id, activeThreadParent?.id, channels, user?.id, user?.username, user?.status]);

  // Clean stale typing indicators every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        let changed = false;
        const next = {};
        for (const [uname, time] of Object.entries(prev)) {
          if (now - time < 3500) {
            next[uname] = time;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      setThreadTypingUsers(prev => {
        let changed = false;
        const next = {};
        for (const [pid, usersMap] of Object.entries(prev)) {
          const filtered = {};
          for (const [uname, time] of Object.entries(usersMap || {})) {
            if (now - time < 3500) {
              filtered[uname] = time;
            } else {
              changed = true;
            }
          }
          if (Object.keys(filtered).length > 0) {
            next[pid] = filtered;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Action: Send Message (with Instant Optimistic UI & Background Upload)
  const sendMessage = useCallback((content, options = {}) => {
    if (!activeChannel) return;
    const { file = null, previewUrl = null, fileUrl = null, parentId = null, replyingParent = null } = options;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const optimisticMsg = {
      id: tempId,
      tempId,
      content: content || '',
      fileUrl: previewUrl || fileUrl,
      isUploading: !!file,
      channelId: activeChannel.id,
      userId: user?.id,
      createdAt: nowIso,
      createAt: nowIso,
      user: {
        id: user?.id,
        name: user?.name,
        username: user?.username,
        avatarUrl: user?.avatarUrl,
      },
      reactions: [],
      parentId,
      parent: replyingParent || null,
    };

    // 1. Immediately display in chat window (Zero Latency)
    setMessages(prev => [...prev, optimisticMsg]);

    // 2. Background File Upload (if attachment exists)
    if (file) {
      (async () => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await uploadApi.uploadFile(formData);
          let uploadedUrl = res.fileUrl || res.data?.fileUrl;
          if (uploadedUrl && uploadedUrl.startsWith('http://res.cloudinary.com')) {
            uploadedUrl = uploadedUrl.replace('http://', 'https://');
          }

          // Update optimistic message with real server URL and remove uploading spinner
          setMessages(prev =>
            prev.map(m => m.id === tempId ? { ...m, fileUrl: uploadedUrl, isUploading: false } : m)
          );

          // Emit real message through socket
          socketService.sendMessage({
            channelId: activeChannel.id,
            content: content || '',
            fileUrl: uploadedUrl,
            parentId,
          });
        } catch (err) {
          console.error('Optimistic file upload failed:', err);
          setMessages(prev =>
            prev.map(m => m.id === tempId ? { ...m, isUploading: false, uploadFailed: true } : m)
          );
        }
      })();
    } else {
      // 3. Regular text message - instant socket emit
      socketService.sendMessage({
        channelId: activeChannel.id,
        content: content || '',
        fileUrl,
        parentId,
      });
    }
  }, [activeChannel, user]);

  // Action: Toggle Reaction
  const toggleReaction = useCallback((messageId, emoji) => {
    if (!activeChannel) return;
    socketService.toggleReaction(messageId, emoji, activeChannel.id);
  }, [activeChannel]);

  // Action: Delete Message
  const deleteMessage = useCallback(async (messageId) => {
    if (!activeChannel) return;
    // 1. Optimistic removal from local state
    setMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      // 2. Call REST API endpoint
      await messageApi.deleteMessage(messageId);
    } catch (err) {
      console.warn('API deleteMessage fallback to socket:', err?.message || err);
    }
    // 3. Emit real-time Socket event to channel
    socketService.deleteMessage(messageId, activeChannel.id);
  }, [activeChannel]);

  // Action: Edit Message
  const editMessage = useCallback(async (messageId, newContent) => {
    // 1. Optimistic update in local state
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, isEdited: true } : m));
    try {
      // 2. Call REST API endpoint
      const res = await messageApi.editMessage(messageId, newContent);
      if (activeChannel?.id) {
        socketService.editMessage(messageId, newContent, activeChannel.id);
      }
      return res?.data || res;
    } catch (err) {
      console.warn('API editMessage fallback to socket:', err?.message || err);
      if (activeChannel?.id) {
        socketService.editMessage(messageId, newContent, activeChannel.id);
      }
    }
  }, [activeChannel]);

  // Action: Create Workspace
  const createWorkspace = useCallback(async (name) => {
    const res = await workspaceApi.createWorkspace({ name });
    const rawWs = res.workspace || res.data || res;
    const newWs = rawWs ? { ...rawWs, role: rawWs.role || 'ADMIN' } : rawWs;
    setWorkspaces(prev => [...prev, newWs]);
    setActiveWorkspace(newWs);
    return newWs;
  }, []);

  // Action: Create Channel
  const createChannel = useCallback(async ({ name, type = 'PUBLIC' }) => {
    if (!activeWorkspace) {
      throw new Error('Chưa chọn Không gian làm việc (Workspace)');
    }
    const res = await channelApi.createChannel({
      name,
      type,
      workspaceId: activeWorkspace.id,
    });
    const newChan = res.channel || res.data || res;
    setChannels(prev => [...prev, newChan]);
    setActiveChannel(newChan);
    return newChan;
  }, [activeWorkspace]);

  // Action: Update Channel (Name, Type)
  const updateChannel = useCallback(async (channelId, data) => {
    const res = await channelApi.updateChannel(channelId, data);
    const updated = res.channel || res.data || res;
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, ...updated } : c));
    setActiveChannel(prev => prev?.id === channelId ? { ...prev, ...updated } : prev);
    return updated;
  }, []);

  // Action: Delete Channel
  const deleteChannel = useCallback(async (channelId) => {
    await channelApi.deleteChannel(channelId);
    setChannels(prev => {
      const remaining = prev.filter(c => c.id !== channelId);
      if (activeChannel?.id === channelId) {
        setActiveChannel(remaining.length > 0 ? remaining[0] : null);
      }
      return remaining;
    });
  }, [activeChannel]);

  // Action: Start Direct Message with User
  const openDirectChat = useCallback(async (targetUserId) => {
    if (!activeWorkspace) {
      throw new Error('Chưa chọn Không gian làm việc (Workspace)');
    }
    const res = await channelApi.getOrCreateDirectChannel({
      targetUserId,
      workspaceId: activeWorkspace.id,
    });
    const directChan = res.channel || res.data || res;
    // Add to channel list if not already present
    setChannels(prev => {
      if (prev.some(c => c.id === directChan.id)) return prev;
      return [...prev, directChan];
    });
    setActiveChannel(directChan);
    return directChan;
  }, [activeWorkspace]);

  // Action: Open Thread
  const openThread = useCallback(async (parentMessage) => {
    setActiveThreadParent(parentMessage);
    setIsLoadingThread(true);
    try {
      // Find replies from currently loaded messages or fetch
      const replies = messages.filter(m => m.parentId === parentMessage.id);
      setThreadReplies(replies);
    } catch (e) {
      console.error('Open thread error:', e);
    } finally {
      setIsLoadingThread(false);
    }
  }, [messages]);

  const closeThread = useCallback(() => {
    setActiveThreadParent(null);
    setThreadReplies([]);
  }, []);

  // Action: Toggle Pin Message
  const togglePinMessage = useCallback(async (messageId) => {
    try {
      const res = await messageApi.togglePin(messageId);
      const updated = res.data || res;
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, isPinned: updated.isPinned } : m)
      );
      return updated;
    } catch (err) {
      console.error('Toggle pin error:', err);
      throw err;
    }
  }, []);

  // Action: Toggle Save / Bookmark Message
  const toggleSaveMessage = useCallback(async (messageId) => {
    try {
      const res = await messageApi.toggleSave(messageId);
      // Reload saved list in background
      loadSavedMessages();
      return res;
    } catch (err) {
      console.error('Toggle save error:', err);
      throw err;
    }
  }, []);

  // Action: Load Saved Messages (Bookmarks)
  const loadSavedMessages = useCallback(async () => {
    setIsLoadingSaved(true);
    try {
      const res = await messageApi.getSavedMessages();
      const list = res.data || res || [];
      setSavedMessages(list);
      return list;
    } catch (err) {
      console.error('loadSavedMessages error:', err);
      return [];
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  // Action: Mark Read Receipts & Clear Local Unread
  const markChannelAsRead = useCallback(async (channelId, messageId) => {
    if (!channelId) return;
    setUnreadCounts(prev => {
      if (!prev[channelId]) return prev;
      const copy = { ...prev };
      delete copy[channelId];
      return copy;
    });
    if (!messageId) return;
    if (user?.id) {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const receipts = m.readReceipts || [];
        const already = receipts.some(r => String(r.userId || r.user?.id || '') === String(user.id));
        if (already) return m;
        return {
          ...m,
          readReceipts: [
            ...receipts,
            {
              userId: user.id,
              user: {
                id: user.id,
                name: user.name,
                username: user.username,
                avatarUrl: user.avatarUrl,
              },
            },
          ],
        };
      }));
    }
    try {
      await messageApi.markAsRead(channelId, messageId);
    } catch (err) {
      // Quiet background failure
    }
  }, [user?.id, user?.name, user?.username, user?.avatarUrl]);

  const clearUnreadThread = useCallback((threadId) => {
    if (!threadId) return;
    setUnreadThreads(prev => {
      if (!prev[threadId]) return prev;
      const copy = { ...prev };
      delete copy[threadId];
      return copy;
    });
  }, []);

  const dismissNotification = useCallback(() => {
    setInAppNotification(null);
  }, []);

  // Compute Unread Totals for Badges
  const unreadChannelTotal = useMemo(() => {
    return channels
      .filter(c => c.type !== 'DIRECT')
      .reduce((sum, c) => sum + (unreadCounts[c.id] || 0), 0);
  }, [channels, unreadCounts]);

  const unreadDirectTotal = useMemo(() => {
    return channels
      .filter(c => c.type === 'DIRECT')
      .reduce((sum, c) => sum + (unreadCounts[c.id] || 0), 0);
  }, [channels, unreadCounts]);

  // Action: Join Workspace by Invite Code
  const joinWorkspaceByCode = useCallback(async (inviteCode) => {
    const res = await workspaceApi.joinWorkspace({ inviteCode: inviteCode.trim() });
    const joinedWs = res.workspace || res.data?.workspace || res.data || res;
    const all = await workspaceApi.getWorkspaces();
    const wsList = Array.isArray(all) ? all : (all.data || all.workspaces || []);
    setWorkspaces(wsList);
    if (joinedWs) {
      setActiveWorkspace(joinedWs);
    }
    return joinedWs;
  }, []);

  // Action: Upload Custom Emoji
  const uploadCustomEmoji = useCallback(async (name, shortcode, file) => {
    if (!activeWorkspace) throw new Error('Chưa chọn Không gian làm việc');
    const formData = new FormData();
    formData.append('name', name);
    const code = shortcode.startsWith(':') && shortcode.endsWith(':') ? shortcode : `:${shortcode.replace(/:/g, '')}:`;
    formData.append('shortcode', code);
    formData.append('workspaceId', activeWorkspace.id);
    formData.append('image', file);

    const res = await emojiApi.uploadCustomEmoji(formData);
    try {
      const emojiData = await emojiApi.getEmojis(activeWorkspace.id);
      const emojis = emojiData.custom || emojiData.data || emojiData || [];
      setCustomEmojis(emojis);
    } catch (e) {
      console.warn('Reload custom emojis error:', e);
    }
    return res;
  }, [activeWorkspace]);

  // Action: Load Older Messages (Cursor-based Pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!activeChannel || isLoadingMore || !hasMoreMessages || messages.length === 0) return;

    // Find the oldest message in the current channel that is not optimistic
    const oldest = messages.find(m => !m.parentId && !m.id?.startsWith('temp_'));
    if (!oldest) return;

    setIsLoadingMore(true);
    try {
      const data = await channelApi.getMessages(activeChannel.id, {
        cursor: oldest.id,
        limit: 30,
      });
      const olderList = Array.isArray(data) ? data : (data.data || data.messages || []);
      if (olderList.length > 0) {
        const sorted = [...olderList].sort((a, b) => new Date(a.createdAt || a.createAt) - new Date(b.createdAt || b.createAt));
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const fresh = sorted.filter(m => !existingIds.has(m.id));
          return [...fresh, ...prev];
        });
      }
      if (data.hasMore !== undefined) {
        setHasMoreMessages(data.hasMore);
      } else {
        setHasMoreMessages(olderList.length >= 30);
      }
    } catch (err) {
      console.error('loadMoreMessages error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeChannel, isLoadingMore, hasMoreMessages, messages]);

  // Action: Update Member Role (RBAC)
  const updateMemberRole = useCallback(async (targetUserId, newRole) => {
    if (!activeWorkspace) return;
    try {
      await workspaceApi.updateMemberRole(activeWorkspace.id, targetUserId, newRole);
      setWorkspaceMembers(prev =>
        prev.map(m => m.id === targetUserId ? { ...m, role: newRole } : m)
      );
    } catch (err) {
      console.error('updateMemberRole error:', err);
      throw err;
    }
  }, [activeWorkspace]);

  // Action: Remove Member from Workspace
  const removeWorkspaceMember = useCallback(async (targetUserId) => {
    if (!activeWorkspace) return;
    try {
      await workspaceApi.removeMember(activeWorkspace.id, targetUserId);
      setWorkspaceMembers(prev => prev.filter(m => m.id !== targetUserId));
    } catch (err) {
      console.error('removeWorkspaceMember error:', err);
      throw err;
    }
  }, [activeWorkspace]);

  // Action: Provision Internal User Account (Admin Only)
  const provisionWorkspaceUser = useCallback(async (data) => {
    if (!activeWorkspace) return;
    const res = await workspaceApi.provisionUser(activeWorkspace.id, data);
    if (res?.data) {
      setWorkspaceMembers(prev => [...prev, res.data]);
    }
    return res?.data;
  }, [activeWorkspace]);

  // Action: Fetch Existing System Users Not Yet in Active Workspace
  const getAvailableWorkspaceUsers = useCallback(async () => {
    if (!activeWorkspace) return [];
    const res = await workspaceApi.getAvailableUsers(activeWorkspace.id);
    return Array.isArray(res) ? res : (res?.data || []);
  }, [activeWorkspace]);

  // Action: Add Existing Users Directly to Active Workspace
  const addWorkspaceMembers = useCallback(async (userIds, role = 'MEMBER') => {
    if (!activeWorkspace) return [];
    const res = await workspaceApi.addMembers(activeWorkspace.id, userIds, role);
    const added = Array.isArray(res?.data) ? res.data : [];
    if (added.length > 0) {
      setWorkspaceMembers(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const fresh = added.filter(u => !existingIds.has(u.id));
        return [...prev, ...fresh];
      });
    }
    return added;
  }, [activeWorkspace]);

  // Action: Lock / Unlock User Account (Offboarding Kill-Switch)
  const toggleMemberActiveStatus = useCallback(async (targetUserId, isActive) => {
    if (!activeWorkspace) return;
    const res = await workspaceApi.toggleMemberStatus(activeWorkspace.id, targetUserId, isActive);
    setWorkspaceMembers(prev =>
      prev.map(m => m.id === targetUserId ? { ...m, isActive } : m)
    );
    return res?.data;
  }, [activeWorkspace]);

  // Action: Delete Custom Emoji (Admin or Creator)
  const deleteCustomEmoji = useCallback(async (emojiId) => {
    await emojiApi.deleteCustomEmoji(emojiId);
    setCustomEmojis(prev => prev.filter(e => e.id !== emojiId));
  }, []);

  // Action: Regenerate short Invite Code (Admin Only)
  const regenerateInviteCode = useCallback(async (workspaceId) => {
    const targetId = workspaceId || activeWorkspace?.id;
    if (!targetId) return;
    const res = await workspaceApi.regenerateInviteCode(targetId);
    const newCode = res?.data?.inviteCode;
    if (newCode) {
      setWorkspaces(prev => prev.map(w => w.id === targetId ? { ...w, inviteCode: newCode } : w));
      setActiveWorkspace(prev => prev?.id === targetId ? { ...prev, inviteCode: newCode } : prev);
    }
    return newCode;
  }, [activeWorkspace?.id]);

  // Action: Delete Workspace (Admin Only)
  const deleteWorkspace = useCallback(async (workspaceId) => {
    const targetId = workspaceId || activeWorkspace?.id;
    if (!targetId) return;
    await workspaceApi.deleteWorkspace(targetId);
    const remaining = workspaces.filter(w => w.id !== targetId);
    setWorkspaces(remaining);
    if (activeWorkspace?.id === targetId) {
      setActiveWorkspace(remaining[0] || null);
      setChannels([]);
      setActiveChannel(null);
      setMessages([]);
    }
  }, [activeWorkspace?.id, workspaces]);

  // Sync missed messages when app returns from background
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        isAuthenticated &&
        activeChannel?.id
      ) {
        socketService.joinChannel(activeChannel.id);
        channelApi.getMessages(activeChannel.id)
          .then((res) => {
            const list = res.data || res;
            if (Array.isArray(list)) {
              const sorted = [...list].sort(
                (a, b) => new Date(a.createdAt || a.createAt) - new Date(b.createdAt || b.createAt)
              );
              setMessages(sorted);
            }
          })
          .catch((e) => console.warn('Background sync messages failed:', e?.message));
      }
      appStateRef.current = nextState;
    });
    return () => subscription?.remove();
  }, [isAuthenticated, activeChannel?.id]);

  // RBAC Roles & Permissions
  const currentUserRole = useMemo(() => {
    if (!activeWorkspace) return 'MEMBER';
    if (activeWorkspace.role) return activeWorkspace.role;
    const myMember = workspaceMembers.find(m => m.id === user?.id);
    return myMember?.role || 'MEMBER';
  }, [activeWorkspace, workspaceMembers, user?.id]);

  const isWorkspaceAdmin = currentUserRole === 'ADMIN';

  const isChannelAdmin = useMemo(() => {
    if (isWorkspaceAdmin) return true;
    if (activeChannel?.createdById === user?.id) return true;
    const myChanMember = activeChannel?.members?.find(m => m.userId === user?.id);
    return myChanMember?.role === 'ADMIN';
  }, [isWorkspaceAdmin, activeChannel, user?.id]);

  return (
    <ChatContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        isLoadingWorkspaces,
        setActiveWorkspace,
        workspaceMembers,
        channels,
        activeChannel,
        setActiveChannel,
        messages,
        isLoadingMessages,
        isLoadingMore,
        hasMoreMessages,
        loadMoreMessages,
        savedMessages,
        isLoadingSaved,
        onlineUsers,
        typingUsers,
        threadTypingUsers,
        customEmojis,
        activeThreadParent,
        threadReplies,
        isLoadingThread,
        currentUserRole,
        isWorkspaceAdmin,
        isChannelAdmin,
        updateMemberRole,
        removeWorkspaceMember,
        provisionWorkspaceUser,
        getAvailableWorkspaceUsers,
        addWorkspaceMembers,
        toggleMemberActiveStatus,
        createWorkspace,
        joinWorkspaceByCode,
        regenerateInviteCode,
        deleteWorkspace,
        uploadCustomEmoji,
        deleteCustomEmoji,
        sendMessage,
        toggleReaction,
        deleteMessage,
        editMessage,
        createChannel,
        updateChannel,
        deleteChannel,
        openDirectChat,
        openThread,
        closeThread,
        togglePinMessage,
        toggleSaveMessage,
        loadSavedMessages,
        markChannelAsRead,
        unreadCounts,
        unreadThreads,
        unreadChannelTotal,
        unreadDirectTotal,
        inAppNotification,
        clearUnreadThread,
        dismissNotification,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
