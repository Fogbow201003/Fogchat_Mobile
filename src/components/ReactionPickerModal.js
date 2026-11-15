import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../config/theme';
import { QUICK_REACTIONS } from '../utils/emoji';

export const ReactionPickerModal = ({
  visible,
  onClose,
  message,
  currentUserId,
  isAdmin = false,
  onReact,
  onReplyThread,
  onEdit,
  onDelete,
  onQuoteReply,
  onTogglePin,
  onToggleSave,
  isSaved = false,
  customEmojis = [],
  onAddCustomEmoji,
}) => {
  if (!message) return null;

  const messageOwnerId = message.userId || message.user?.id;
  const isOwner = !!(
    messageOwnerId &&
    currentUserId &&
    String(messageOwnerId).toLowerCase() === String(currentUserId).toLowerCase()
  );
  const isPinned = !!message.isPinned;
  const canDelete = isOwner || isAdmin;

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
            <View style={styles.sheetContainer}>
              <View style={styles.handleBar} />

              {/* 1. Quick Reactions Bar */}
              <Text style={styles.sectionTitle}>THẢ CẢM XÚC NHANH</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reactionRow}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionBtn}
                    onPress={() => {
                      onReact(message.id, emoji);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionEmojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 2. Custom Workspace Emojis (Slack-style) */}
              <View style={styles.customSectionHeaderRow}>
                <Text style={styles.sectionTitle}>EMOJI WORKSPACE</Text>
                {onAddCustomEmoji && (
                  <TouchableOpacity
                    style={styles.addCustomEmojiBadge}
                    onPress={() => {
                      onClose();
                      onAddCustomEmoji();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={13} color={THEME.primary} />
                    <Text style={styles.addCustomEmojiBadgeText}>Thêm</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reactionRow}
              >
                {onAddCustomEmoji && (
                  <TouchableOpacity
                    style={styles.addEmojiCircleBtn}
                    onPress={() => {
                      onClose();
                      onAddCustomEmoji();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color={THEME.primary} />
                  </TouchableOpacity>
                )}

                {customEmojis.map((c) => (
                  <TouchableOpacity
                    key={c.shortcode}
                    style={styles.customEmojiBtn}
                    onPress={() => {
                      onReact(message.id, c.shortcode);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: c.imageUrl }} style={styles.customEmojiImg} />
                  </TouchableOpacity>
                ))}

                {customEmojis.length === 0 && (
                  <Text style={styles.emptyCustomHintText}>
                    Chưa có emoji tùy biến. Nhấn "+" để thêm!
                  </Text>
                )}
              </ScrollView>

              {/* 3. Action Menu Items */}
              <View style={styles.menuDivider} />

              {/* Reply in Thread (Hidden if already in thread) */}
              {onReplyThread && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onReplyThread(message);
                  }}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                    <Ionicons name="chatbubbles-outline" size={20} color={THEME.primary} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuTitle}>Trả lời theo luồng (Thread)</Text>
                    <Text style={styles.menuSub}>Thảo luận chi tiết trong luồng riêng biệt</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Toggle Pin Message */}
              {onTogglePin && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onTogglePin(message);
                  }}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name={isPinned ? 'pin' : 'pin-outline'} size={20} color={THEME.accent} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuTitle}>
                      {isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn lên đầu kênh'}
                    </Text>
                    <Text style={styles.menuSub}>
                      {isPinned ? 'Gỡ khỏi danh sách ghim của kênh' : 'Giúp các thành viên chú ý thông báo quan trọng'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Toggle Save / Bookmark Message */}
              {onToggleSave && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onToggleSave(message);
                  }}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                    <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color="#A855F7" />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuTitle}>
                      {isSaved ? 'Bỏ lưu tin nhắn' : 'Lưu tin nhắn (Bookmark)'}
                    </Text>
                    <Text style={styles.menuSub}>
                      {isSaved ? 'Xóa khỏi mục Đã lưu của bạn' : 'Xem lại bất cứ lúc nào trong Mục đã lưu'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Edit (Author Only) */}
              {isOwner && onEdit && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onEdit(message);
                  }}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Ionicons name="create-outline" size={20} color={THEME.accent} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuTitle}>Chỉnh sửa tin nhắn</Text>
                    <Text style={styles.menuSub}>Sửa lại nội dung tin nhắn đã gửi</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Delete / Moderate (Author OR Admin) */}
              {canDelete && onDelete && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onDelete(message.id);
                  }}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Ionicons name="trash-outline" size={20} color={THEME.danger} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={[styles.menuTitle, { color: THEME.danger }]}>
                      Xóa tin nhắn
                    </Text>
                    <Text style={styles.menuSub}>
                      {isOwner
                        ? 'Xóa vĩnh viễn tin nhắn khỏi kênh'
                        : (message.user?.name
                            ? `Gỡ bỏ tin nhắn của ${message.user.name} (Quyền Quản trị)`
                            : 'Gỡ bỏ tin nhắn theo quyền Quản trị')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
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
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.textDim,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textDim,
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 4,
  },
  customSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 4,
  },
  addCustomEmojiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addCustomEmojiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primary,
  },
  addEmojiCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCustomHintText: {
    fontSize: 11,
    color: THEME.textDim,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    paddingHorizontal: 4,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmojiText: {
    fontSize: 22,
  },
  customEmojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customEmojiImg: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  menuDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  menuSub: {
    fontSize: 11,
    color: THEME.textDim,
    marginTop: 2,
  },
});
