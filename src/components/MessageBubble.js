import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../config/theme';
import { Avatar } from './Avatar';
import { formatMessageTime } from '../utils/date';
import { parseMessageContent } from '../utils/emoji';
import { API_BASE_URL, getApiBaseUrl } from '../services/api';

const isImageFile = (url = '') => {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  const docExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.zip', '.rar', '.7z', '.csv', '.json', '.xml',
    '.mp3', '.mp4', '.wav', '.mov'
  ];
  if (docExtensions.some((ext) => clean.endsWith(ext))) {
    return false;
  }
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.heic'];
  if (imageExtensions.some((ext) => clean.endsWith(ext))) {
    return true;
  }
  if (clean.includes('/image/upload/') && !clean.includes('/raw/upload/')) {
    return true;
  }
  if (clean.startsWith('blob:') || clean.startsWith('data:image/') || clean.startsWith('file://')) {
    return true;
  }
  return false;
};

const getFileDetails = (url = '') => {
  if (!url) return { name: 'Tài liệu đính kèm', ext: 'FILE', type: 'doc' };
  const clean = url.split('?')[0];
  const raw = clean.split('/').pop() || 'Tài liệu đính kèm';
  const name = decodeURIComponent(raw).replace(/^\d{10,15}_/, '');
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
  let type = 'doc';
  if (ext === 'PDF') type = 'pdf';
  else if (['DOC', 'DOCX'].includes(ext)) type = 'word';
  else if (['XLS', 'XLSX', 'CSV'].includes(ext)) type = 'excel';
  else if (['ZIP', 'RAR', '7Z', 'TAR'].includes(ext)) type = 'archive';
  return { name, ext, type };
};

export const MessageBubbleComponent = ({
  message,
  currentUserId,
  onLongPress,
  onReact,
  onOpenThread,
  onPressImage,
  onQuickReply,
  onPressUser,
  onPressReadReceipts,
  onLongPressReaction,
  customEmojis = [],
  isOnline = false,
  userStatus,
  displayReadReceipts,
  isSeenByOthers,
  showAvatar = true,
  threadReplyCount = 0,
  hasUnreadReplies = false,
}) => {
  if (!message) return null;

  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const messageOwnerId = message.userId || message.user?.id;
  const isMyMessage = !!(
    messageOwnerId &&
    currentUserId &&
    String(messageOwnerId).toLowerCase() === String(currentUserId).toLowerCase()
  );
  const user = message.user || {};
  const senderName = user.name || user.username || 'Thành viên';
  const reactions = message.reactions || [];
  // Chỉ hiển thị avatar đã xem của người khác (ẩn bản thân)
  const otherReadReceipts = displayReadReceipts !== undefined
    ? displayReadReceipts
    : (message.readReceipts || []).filter(
        (r) => String(r.userId || r.user?.id || '') !== String(currentUserId || '')
      );
  const hasBeenSeenByOthers = isSeenByOthers !== undefined
    ? isSeenByOthers
    : otherReadReceipts.length > 0;

  const rawTime = message.createdAt || message.createAt;
  const formattedTime = formatMessageTime(rawTime);

  // Group reactions: { [emoji]: { count, hasReacted } }
  const reactionGroups = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, hasReacted: false };
    }
    acc[r.emoji].count += 1;
    if (r.userId === currentUserId) {
      acc[r.emoji].hasReacted = true;
    }
    return acc;
  }, {});

  // Parse message content for custom emojis & mentions
  const parsedTokens = parseMessageContent(message.content, customEmojis);
  const hasCodeBlock = message.content?.includes('```');

  const handleOpenDoc = (url) => {
    if (!url) return;
    // Đảm bảo dùng HTTPS cho link Cloudinary
    let targetUrl = url.startsWith('http://res.cloudinary.com')
      ? url.replace('http://', 'https://')
      : url;

    // Nếu là file Cloudinary tài liệu (PDF, Word, ZIP...), dẫn qua endpoint download của backend server
    // để được tải an toàn và tránh mã lỗi 401 ACL do Cloudinary chặn direct CDN
    const isCloudinaryDoc = targetUrl.includes('res.cloudinary.com') &&
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|txt|csv)(\?|$)/i.test(targetUrl);

    const baseUrl = getApiBaseUrl();
    const downloadUrl = isCloudinaryDoc
      ? `${baseUrl}/upload/download?url=${encodeURIComponent(targetUrl)}`
      : targetUrl;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(downloadUrl, '_blank');
      }
    } else {
      Linking.openURL(downloadUrl).catch(() => {
        // Fallback mở URL gốc nếu có lỗi
        Linking.openURL(targetUrl).catch((err) => {
          console.warn('Không thể mở URL trực tiếp:', err?.message);
          Alert.alert('Không thể mở file', 'Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.');
        });
      });
    }
  };

  const rawFileUrl = message.fileUrl || '';
  const safeFileUrl = rawFileUrl.startsWith('http://res.cloudinary.com')
    ? rawFileUrl.replace('http://', 'https://')
    : rawFileUrl;

  const fileInfo = safeFileUrl ? getFileDetails(safeFileUrl) : null;
  const isImage = safeFileUrl ? isImageFile(safeFileUrl) : false;

  const isSystemNotice =
    Boolean(message.isSystem) ||
    (!message.fileUrl &&
      /^👋\s*(Chào mừng .* đã gia nhập Không gian làm việc|Chào mừng .* đã được thêm vào Không gian làm việc)/.test(
        (message.content || '').trim()
      ));

  if (isSystemNotice) {
    return (
      <View style={styles.systemNoticeWrap}>
        <View style={styles.systemNoticePill}>
          <Text style={styles.systemNoticeText}>
            {parsedTokens.map((tok, i) =>
              tok.type === 'mention' ? (
                <Text key={i} style={styles.systemMentionText}>
                  {tok.value}
                </Text>
              ) : (
                <Text key={i}>{tok.value}</Text>
              )
            )}
          </Text>
          {formattedTime ? <Text style={styles.systemNoticeTime}>{formattedTime}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isMyMessage ? styles.myContainer : styles.otherContainer]}>
      {/* Avatar for others */}
      {!isMyMessage && showAvatar && (
        <TouchableOpacity
          activeOpacity={0.75}
          disabled={!onPressUser}
          onPress={() => onPressUser && onPressUser(user)}
        >
          <Avatar
            uri={user.avatarUrl}
            name={senderName}
            size={36}
            isOnline={isOnline}
            status={isOnline ? (userStatus || user.status || 'ONLINE') : 'OFFLINE'}
            style={styles.avatar}
          />
        </TouchableOpacity>
      )}

      <View style={[styles.bubbleWrapper, isMyMessage ? styles.myBubbleWrapper : styles.otherBubbleWrapper]}>
        {/* Pinned Tag */}
        {message.isPinned && (
          <View style={[styles.pinnedTag, isMyMessage ? styles.myPinnedTag : styles.otherPinnedTag]}>
            <Ionicons name="pin" size={11} color="#F59E0B" />
            <Text style={styles.pinnedTagText}>Đã ghim trong kênh</Text>
          </View>
        )}

        {/* Sender name & time header for others */}
        {!isMyMessage && showAvatar && (
          <View style={styles.senderHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!onPressUser}
              onPress={() => onPressUser && onPressUser(user)}
            >
              <Text style={styles.senderName}>{senderName}</Text>
            </TouchableOpacity>
            <Text style={styles.timestamp}>{formattedTime}</Text>
          </View>
        )}

        {/* Bubble body */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onLongPress && onLongPress(message)}
          onLongPress={() => onLongPress && onLongPress(message)}
          style={[styles.bubble, isMyMessage ? styles.myBubble : styles.otherBubble]}
        >
          {/* Quoted Parent Message Preview */}
          {message.parent && (
            <View style={[styles.quoteBlock, isMyMessage ? styles.myQuoteBlock : styles.otherQuoteBlock]}>
              <View style={[styles.quoteBar, isMyMessage ? styles.myQuoteBar : styles.otherQuoteBar]} />
              <View style={styles.quoteContent}>
                <View style={styles.quoteHeaderRow}>
                  <Ionicons name="return-down-forward" size={12} color={isMyMessage ? '#67E8F9' : THEME.primary} />
                  <Text style={[styles.quoteAuthor, isMyMessage && { color: '#E0F2FE' }]}>
                    {message.parent.user?.name || message.parent.user?.username || 'Đồng nghiệp'}
                  </Text>
                </View>
                <Text style={styles.quoteSnippet} numberOfLines={1}>
                  {message.parent.content || (message.parent.fileUrl ? '[Tệp tin / Hình ảnh]' : '')}
                </Text>
              </View>
            </View>
          )}

          {/* Media / File Attachment */}
          {message.fileUrl && (
            isImage ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onPressImage && onPressImage(safeFileUrl, senderName, rawTime)}
                style={styles.mediaContainer}
              >
                {!imageError ? (
                  <>
                    <Image
                      source={{ uri: safeFileUrl }}
                      style={styles.mediaImage}
                      onLoadStart={() => setIsImageLoading(true)}
                      onLoadEnd={() => setIsImageLoading(false)}
                      onError={() => {
                        setIsImageLoading(false);
                        setImageError(true);
                      }}
                    />
                    {isImageLoading && !message.isUploading && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="small" color={THEME.primary} />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.imageErrorBox}>
                    <Ionicons name="image-outline" size={28} color={THEME.textDim} />
                    <Text style={styles.imageErrorText}>Không thể hiển thị ảnh</Text>
                    <TouchableOpacity onPress={() => handleOpenDoc(safeFileUrl)}>
                      <Text style={styles.imageErrorLink}>Mở liên kết gốc</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {message.isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.uploadingText}>Đang tải ảnh...</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleOpenDoc(message.fileUrl)}
                style={[styles.docContainer, isMyMessage ? styles.myDocContainer : styles.otherDocContainer]}
              >
                <View style={[
                  styles.docIconBox,
                  fileInfo.type === 'pdf' && { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                  fileInfo.type === 'word' && { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
                  fileInfo.type === 'excel' && { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
                  fileInfo.type === 'archive' && { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                ]}>
                  <Ionicons
                    name={
                      fileInfo.type === 'pdf' ? 'document-text' :
                      fileInfo.type === 'word' ? 'document' :
                      fileInfo.type === 'excel' ? 'grid' :
                      fileInfo.type === 'archive' ? 'archive' : 'document-attach'
                    }
                    size={24}
                    color={
                      fileInfo.type === 'pdf' ? '#EF4444' :
                      fileInfo.type === 'word' ? '#3B82F6' :
                      fileInfo.type === 'excel' ? '#10B981' :
                      fileInfo.type === 'archive' ? '#F59E0B' : THEME.primary
                    }
                  />
                </View>
                <View style={styles.docInfo}>
                  <Text style={[styles.docTitle, isMyMessage && { color: '#FFFFFF' }]} numberOfLines={1}>
                    {fileInfo.name}
                  </Text>
                  <View style={styles.docMetaRow}>
                    <View style={styles.docExtBadge}>
                      <Text style={styles.docExtBadgeText}>{fileInfo.ext}</Text>
                    </View>
                    <Text style={[styles.docSub, isMyMessage && { color: 'rgba(255,255,255,0.7)' }]}>
                      Nhấn để mở / tải về
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={isMyMessage ? '#FFFFFF' : THEME.primary}
                />
              </TouchableOpacity>
            )
          )}

          {/* Text Content */}
          {hasCodeBlock ? (
            <View style={styles.codeBlockCard}>
              <View style={styles.codeHeader}>
                <Ionicons name="code-slash" size={13} color={THEME.primaryLight} />
                <Text style={styles.codeTitle}>CODE SNIPPET</Text>
              </View>
              <Text style={styles.codeText}>
                {message.content.replace(/```[a-z]*\n?/gi, '').trim()}
              </Text>
            </View>
          ) : (
            message.content ? (
              <View style={styles.textContainer}>
                {parsedTokens.map((token, idx) => {
                  if (token.type === 'custom_emoji') {
                    return (
                      <Image
                        key={idx}
                        source={{ uri: token.imageUrl }}
                        style={styles.inlineEmoji}
                      />
                    );
                  }
                  if (token.type === 'mention') {
                    return (
                      <View key={idx} style={styles.mentionPill}>
                        <Text style={styles.mentionText}>{token.value}</Text>
                      </View>
                    );
                  }
                  return (
                    <Text
                      key={idx}
                      style={[
                        styles.messageText,
                        isMyMessage ? styles.myMessageText : styles.otherMessageText,
                      ]}
                    >
                      {token.value}
                    </Text>
                  );
                })}
              </View>
            ) : null
          )}

          {/* Timestamp & Status Footer */}
          {isMyMessage ? (
            <View style={styles.myFooter}>
              {message.isEdited && <Text style={styles.editedMark}>(đã sửa) </Text>}
              <Text style={styles.myTimestamp}>{formattedTime}</Text>
              {message.id?.startsWith('temp_') ? (
                <Ionicons name="time-outline" size={13} color="rgba(255, 255, 255, 0.7)" style={styles.checkIcon} />
              ) : null}
            </View>
          ) : (
            <View style={styles.otherFooter}>
              {message.isEdited && <Text style={styles.editedMarkOther}>(đã sửa) </Text>}
              <Text style={styles.otherTimestamp}>{formattedTime}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Quick Action Button (...) */}
        <View style={[styles.actionTriggerRow, isMyMessage ? styles.myActionTrigger : styles.otherActionTrigger]}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => onLongPress && onLongPress(message)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={13} color={THEME.textDim} />
          </TouchableOpacity>
          {onQuickReply && (
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => onQuickReply(message)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-undo-outline" size={13} color={THEME.textDim} />
            </TouchableOpacity>
          )}
        </View>

        {/* Reaction badges */}
        {Object.keys(reactionGroups).length > 0 && (
          <View style={[styles.reactionsRow, isMyMessage ? styles.myReactionsRow : styles.otherReactionsRow]}>
            {Object.entries(reactionGroups).map(([emoji, data]) => {
              const custom = customEmojis.find((c) => c.shortcode === emoji);
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionPill, data.hasReacted && styles.reactionPillActive]}
                  onPress={() => onReact(message.id, emoji)}
                  onLongPress={() => onLongPressReaction && onLongPressReaction(message.reactions || [], emoji)}
                  activeOpacity={0.7}
                >
                  {custom ? (
                    <Image source={{ uri: custom.imageUrl }} style={styles.pillCustomEmoji} />
                  ) : (
                    <Text style={styles.pillEmojiText}>{emoji}</Text>
                  )}
                  <Text style={[styles.pillCountText, data.hasReacted && styles.pillCountActive]}>
                    {data.count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Thread indicator if replies exist */}
        {threadReplyCount > 0 && (
          <TouchableOpacity
            style={[
              styles.threadBar,
              isMyMessage ? styles.myThreadBar : styles.otherThreadBar,
              hasUnreadReplies && styles.threadBarUnread,
            ]}
            onPress={() => onOpenThread(message)}
            activeOpacity={0.75}
          >
            <Ionicons name="chatbubbles" size={14} color={hasUnreadReplies ? '#FFFFFF' : THEME.primary} />
            <Text style={[styles.threadBarText, hasUnreadReplies && styles.threadBarTextUnread]}>
              {threadReplyCount} phản hồi
            </Text>
            {hasUnreadReplies && <View style={styles.threadUnreadDot} />}
            <Ionicons name="chevron-forward" size={12} color={hasUnreadReplies ? '#FFFFFF' : THEME.primaryLight} />
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
};

export const MessageBubble = memo(MessageBubbleComponent, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.fileUrl === nextProps.message.fileUrl &&
    prevProps.message.isEdited === nextProps.message.isEdited &&
    prevProps.message.isPinned === nextProps.message.isPinned &&
    prevProps.isOnline === nextProps.isOnline &&
    prevProps.userStatus === nextProps.userStatus &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.threadReplyCount === nextProps.threadReplyCount &&
    prevProps.hasUnreadReplies === nextProps.hasUnreadReplies &&
    prevProps.isSeenByOthers === nextProps.isSeenByOthers &&
    prevProps.message.user?.avatarUrl === nextProps.message.user?.avatarUrl &&
    prevProps.message.user?.name === nextProps.message.user?.name &&
    prevProps.message.reactions?.length === nextProps.message.reactions?.length &&
    prevProps.message.readReceipts?.length === nextProps.message.readReceipts?.length &&
    prevProps.displayReadReceipts?.length === nextProps.displayReadReceipts?.length
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  myContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  bubbleWrapper: {
    maxWidth: '82%',
  },
  myBubbleWrapper: {
    alignItems: 'flex-end',
  },
  otherBubbleWrapper: {
    alignItems: 'flex-start',
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    marginLeft: 4,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  timestamp: {
    fontSize: 10,
    color: THEME.textDim,
  },
  bubble: {
    borderRadius: THEME.radiusMd,
    paddingHorizontal: 13,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: THEME.myBubbleBg,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  otherBubble: {
    backgroundColor: THEME.otherBubbleBg,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.otherBubbleBorder,
  },
  textContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: THEME.text,
  },
  codeBlockCard: {
    backgroundColor: '#090D14',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    padding: 10,
    marginVertical: 4,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  codeTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.8,
  },
  codeText: {
    color: '#A5F3FC',
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  myFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  myTimestamp: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  otherFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  otherTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  editedMark: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  editedMarkOther: {
    fontSize: 10,
    color: THEME.textDim,
    fontStyle: 'italic',
  },
  checkIcon: {
    marginLeft: 2,
  },
  actionTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  myActionTrigger: {
    justifyContent: 'flex-end',
  },
  otherActionTrigger: {
    justifyContent: 'flex-start',
  },
  quickActionBtn: {
    padding: 2,
    opacity: 0.6,
  },
  mediaContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
    maxHeight: 220,
    backgroundColor: THEME.surfaceElevated,
    position: 'relative',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  mediaImage: {
    width: 220,
    height: 180,
    resizeMode: 'cover',
  },
  imageErrorBox: {
    width: 220,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surface,
    padding: 12,
    gap: 6,
  },
  imageErrorText: {
    fontSize: 12,
    color: THEME.textDim,
    fontWeight: '600',
  },
  imageErrorLink: {
    fontSize: 11,
    color: THEME.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  docContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 10,
    marginBottom: 6,
    minWidth: 200,
  },
  myDocContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  otherDocContainer: {
    backgroundColor: THEME.surfaceElevated,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  docExtBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  docExtBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.primaryLight,
  },
  docSub: {
    fontSize: 11,
    color: THEME.textDim,
  },
  inlineEmoji: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginHorizontal: 2,
  },
  mentionPill: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  mentionText: {
    color: THEME.primaryLight,
    fontWeight: '700',
    fontSize: 13,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  myReactionsRow: {
    justifyContent: 'flex-end',
  },
  otherReactionsRow: {
    justifyContent: 'flex-start',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  reactionPillActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.22)',
    borderColor: THEME.primary,
  },
  pillEmojiText: {
    fontSize: 13,
  },
  pillCustomEmoji: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  pillCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  pillCountActive: {
    color: THEME.primaryLight,
  },
  threadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  myThreadBar: {
    alignSelf: 'flex-end',
  },
  otherThreadBar: {
    alignSelf: 'flex-start',
  },
  threadBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  threadBarUnread: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: THEME.secondary,
  },
  threadBarTextUnread: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  threadUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.secondary,
  },
  pinnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  myPinnedTag: {
    alignSelf: 'flex-end',
  },
  otherPinnedTag: {
    alignSelf: 'flex-start',
  },
  pinnedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  quoteBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
  },
  myQuoteBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  otherQuoteBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  quoteBar: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginRight: 8,
  },
  myQuoteBar: {
    backgroundColor: '#67E8F9',
  },
  otherQuoteBar: {
    backgroundColor: THEME.primary,
  },
  quoteContent: {
    flex: 1,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  quoteAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primaryLight,
  },
  quoteSnippet: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  readReceiptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 2,
  },
  myReadReceipts: {
    justifyContent: 'flex-end',
  },
  otherReadReceipts: {
    justifyContent: 'flex-start',
  },
  miniAvatarWrap: {
    marginRight: 2,
    borderWidth: 1,
    borderColor: THEME.background,
    borderRadius: 8,
  },
  extraReceiptsText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.textDim,
    marginLeft: 2,
  },
  systemNoticeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    paddingHorizontal: 18,
  },
  systemNoticePill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  systemNoticeText: {
    fontSize: 12,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  systemMentionText: {
    color: THEME.primaryLight,
    fontWeight: '700',
  },
  systemNoticeTime: {
    fontSize: 10,
    color: THEME.textDim,
  },
});
