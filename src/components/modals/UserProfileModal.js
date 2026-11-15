import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { Avatar } from '../Avatar';

const STATUS_META = {
  ONLINE: { label: 'Trực tuyến', color: '#10B981' },
  AWAY: { label: 'Vắng mặt', color: '#F59E0B' },
  DND: { label: 'Đừng làm phiền', color: '#EF4444' },
  OFFLINE: { label: 'Ngoại tuyến', color: '#64748B' },
};

/**
 * Modal hiển thị thông tin công khai của thành viên (tham khảo Mattermost & Slack)
 */
export const UserProfileModal = ({
  visible,
  user,
  isOnline = false,
  currentUserId,
  showDirectMessageBtn = false,
  onSendMessage,
  onClose,
}) => {
  if (!user) return null;

  const isSelf = currentUserId && user.id === currentUserId;
  const effectiveStatus = isOnline
    ? (user.status && user.status !== 'OFFLINE' ? user.status : 'ONLINE')
    : 'OFFLINE';
  const statusInfo = STATUS_META[effectiveStatus] || STATUS_META.OFFLINE;
  const displayName = user.name || user.username || 'Thành viên';

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
              <TouchableOpacity onPress={onClose} style={styles.closeBtnFloating} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={THEME.text} />
              </TouchableOpacity>

              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {/* Header Banner inside ScrollView so Avatar isn't clipped */}
                <View style={styles.banner} />

                {/* Avatar & Identity */}
                <View style={styles.profileTop}>
                  <View style={styles.avatarRing}>
                    <Avatar
                      uri={user.avatarUrl}
                      name={displayName}
                      size={76}
                      isOnline={isOnline}
                      showStatus={true}
                    />
                  </View>

                  <Text style={styles.name}>{displayName}</Text>
                  {user.username ? (
                    <Text style={styles.username}>@{user.username}</Text>
                  ) : null}

                  {/* Status Pill */}
                  <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                    <Text style={styles.statusText}>{statusInfo.label}</Text>
                  </View>

                  {user.customStatus ? (
                    <Text style={styles.customStatus} numberOfLines={2}>
                      “{user.customStatus}”
                    </Text>
                  ) : null}
                </View>

                {/* Public Details */}
                <View style={styles.detailsSection}>
                  {user.title ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="briefcase-outline" size={16} color={THEME.primary} />
                      <View style={styles.detailTextWrap}>
                        <Text style={styles.detailLabel}>Chức danh</Text>
                        <Text style={styles.detailValue}>{user.title}</Text>
                      </View>
                    </View>
                  ) : null}

                  {user.email ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="mail-outline" size={16} color={THEME.primary} />
                      <View style={styles.detailTextWrap}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{user.email}</Text>
                      </View>
                    </View>
                  ) : null}

                  {user.phone ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={16} color={THEME.primary} />
                      <View style={styles.detailTextWrap}>
                        <Text style={styles.detailLabel}>Số điện thoại</Text>
                        <Text style={styles.detailValue}>{user.phone}</Text>
                      </View>
                    </View>
                  ) : null}

                  {!user.title && !user.email && !user.phone && (
                    <Text style={styles.noExtraText}>
                      Thành viên chưa cập nhật thêm thông tin liên hệ.
                    </Text>
                  )}
                </View>

                {/* Action Button */}
                {showDirectMessageBtn && !isSelf && onSendMessage && (
                  <View style={styles.actionFooter}>
                    <TouchableOpacity
                      style={styles.dmBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose();
                        onSendMessage(user);
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.dmBtnText}>Nhắn tin trực tiếp</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '82%',
    backgroundColor: THEME.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  banner: {
    height: 64,
    backgroundColor: 'rgba(6, 182, 212, 0.14)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  closeBtnFloating: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(11, 14, 20, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTop: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginTop: -38,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 44,
    backgroundColor: THEME.surface,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  name: {
    color: THEME.text,
    fontSize: 19,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  username: {
    color: THEME.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: '600',
  },
  customStatus: {
    color: THEME.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    color: THEME.textDim,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    color: THEME.text,
    fontSize: 14,
    marginTop: 1,
  },
  noExtraText: {
    color: THEME.textDim,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 4,
  },
  actionFooter: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 4,
  },
  dmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    paddingVertical: 11,
    borderRadius: 12,
  },
  dmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
