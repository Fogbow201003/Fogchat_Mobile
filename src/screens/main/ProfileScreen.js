import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../../components/Avatar';
import * as ImagePicker from 'expo-image-picker';
import { userApi, uploadApi } from '../../services/api';
import { UploadCustomEmojiModal } from '../modals/UploadCustomEmojiModal';
import { WorkspaceAdminModal } from '../modals/WorkspaceAdminModal';

const STATUS_OPTIONS = [
  { key: 'ONLINE', label: 'Trực tuyến', color: '#10B981', icon: 'radio-button-on' },
  { key: 'AWAY', label: 'Vắng mặt', color: '#F59E0B', icon: 'time-outline' },
  { key: 'DND', label: 'Đừng làm phiền', color: '#EF4444', icon: 'remove-circle-outline' },
  { key: 'OFFLINE', label: 'Ngoại tuyến', color: '#6B7280', icon: 'radio-button-off' },
];

export const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUserData } = useAuth();
  const { workspaces, channels, activeWorkspace, isWorkspaceAdmin, currentUserRole } = useChat();

  const [showEmojiUpload, setShowEmojiUpload] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleQuickStatusChange = async (statusKey) => {
    if (isUpdatingStatus || user?.status === statusKey) return;
    setIsUpdatingStatus(true);
    const prevStatus = user?.status;
    updateUserData({ status: statusKey });
    try {
      await userApi.updateStatus({ status: statusKey, customStatus: user?.customStatus || '' });
    } catch (err) {
      updateUserData({ status: prevStatus });
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleCopyInviteCode = () => {
    if (!activeWorkspace?.inviteCode) return;
    if (Platform.OS === 'web' && navigator?.clipboard) {
      navigator.clipboard.writeText(activeWorkspace.inviteCode);
    }
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
    Alert.alert('Đã sao chép', `Mã mời Workspace:\n${activeWorkspace.inviteCode}\n\nHãy gửi mã này cho đồng nghiệp để mời họ tham gia!`);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi FogChat?') : true;
      if (confirmed) {
        logout();
      }
      return;
    }
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi FogChat?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const currentStatusObj = STATUS_OPTIONS.find(s => s.key === user?.status) || STATUS_OPTIONS[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 1. Profile Hero Card */}
        <View style={styles.heroCard}>
          <TouchableOpacity onPress={handleOpenEditProfile} activeOpacity={0.8} style={styles.avatarWrapper}>
            <Avatar
              uri={user?.avatarUrl}
              name={user?.name || user?.username}
              size={80}
              isOnline={user?.status !== 'OFFLINE'}
              status={user?.status || 'ONLINE'}
              showStatus={true}
              style={styles.heroAvatar}
            />
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name || user?.username || 'Thành viên'}</Text>
          <Text style={styles.userHandle}>@{user?.username || 'user'}</Text>
          {!!user?.title && <Text style={styles.userTitle}>{user.title}</Text>}

          {/* Status Indicator Pill */}
          <TouchableOpacity
            style={styles.statusPill}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.75}
          >
            <View style={[styles.statusDot, { backgroundColor: currentStatusObj.color }]} />
            <Text style={styles.statusLabel}>{currentStatusObj.label}</Text>
            {!!user?.customStatus && (
              <Text style={styles.customStatusText}>• "{user.customStatus}"</Text>
            )}
            <Ionicons name="create-outline" size={13} color={THEME.textDim} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {/* Quick Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={handleOpenEditProfile}
            activeOpacity={0.8}
          >
            <Ionicons name="person" size={13} color={THEME.primary} />
            <Text style={styles.editProfileBtnText}>Chỉnh sửa thông tin</Text>
          </TouchableOpacity>

          {/* 1-Tap Quick Status Switcher */}
          <View style={styles.quickStatusRow}>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = (user?.status || 'ONLINE') === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.quickStatusChip,
                    isSelected && { borderColor: opt.color, backgroundColor: `${opt.color}18` },
                  ]}
                  onPress={() => handleQuickStatusChange(opt.key)}
                  disabled={isUpdatingStatus}
                  activeOpacity={0.75}
                >
                  <View style={[styles.quickStatusDot, { backgroundColor: opt.color }]} />
                  <Text
                    style={[
                      styles.quickStatusLabel,
                      isSelected && { color: THEME.text, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{workspaces.length}</Text>
            <Text style={styles.statLabel}>Không gian</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{channels.filter(c => c.type !== 'DIRECT').length}</Text>
            <Text style={styles.statLabel}>Kênh tham gia</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Ionicons name="shield-checkmark" size={18} color={THEME.primary} />
            <Text style={styles.statLabel}>{currentUserRole || 'MEMBER'}</Text>
          </View>
        </View>

        {/* 3. Feature Shortcut Cards */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>TÍNH NĂNG VÀ LỐI TẮT</Text>

          {/* Saved Messages */}
          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => navigation.navigate('SavedMessages')}
            activeOpacity={0.7}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="bookmark" size={20} color="#A855F7" />
            </View>
            <View style={styles.shortcutTextWrap}>
              <Text style={styles.shortcutTitle}>Mục đã lưu (Bookmarks)</Text>
              <Text style={styles.shortcutSub}>Xem lại các tin nhắn và tệp bạn đã đánh dấu</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.textDim} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Custom Workspace Emoji */}
          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => setShowEmojiUpload(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <Ionicons name="happy" size={20} color={THEME.primary} />
            </View>
            <View style={styles.shortcutTextWrap}>
              <Text style={styles.shortcutTitle}>Tải lên Custom Emoji</Text>
              <Text style={styles.shortcutSub}>Thêm biểu tượng cảm xúc độc quyền cho Workspace</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.textDim} />
          </TouchableOpacity>

          {isWorkspaceAdmin && activeWorkspace && (
            <>
              <View style={styles.rowDivider} />
              <TouchableOpacity
                style={styles.shortcutItem}
                onPress={() => setShowAdminModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.shortcutIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.14)' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#EF4444" />
                </View>
                <View style={styles.shortcutTextWrap}>
                  <Text style={styles.shortcutTitle}>Quản trị Nhân sự & Cấp tài khoản</Text>
                  <Text style={styles.shortcutSub}>Cấp nick nội bộ, phân quyền & khóa tài khoản tức thì</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={THEME.textDim} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 4. Account Details Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>THÔNG TIN TÀI KHOẢN</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={THEME.textDim} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Email đăng nhập</Text>
              <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={THEME.textDim} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{user?.phone || 'Chưa cập nhật'}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="person-circle-outline" size={18} color={THEME.textDim} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Mã nhân sự (Staff ID)</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.id ? `#${user.id.slice(0, 8).toUpperCase()}` : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Settings Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>CÀI ĐẶT ỨNG DỤNG</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLead}>
              <Ionicons name="shield-checkmark-outline" size={20} color={THEME.primary} />
              <View>
                <Text style={styles.settingTitle}>Bảo mật kết nối</Text>
                <Text style={styles.settingSub}>Mã hóa đường truyền WebSocket Real-time</Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={18} color={THEME.success} />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLead}>
              <Ionicons name="moon-outline" size={20} color={THEME.secondary} />
              <View>
                <Text style={styles.settingTitle}>Giao diện (Theme)</Text>
                <Text style={styles.settingSub}>Cyber Obsidian Dark Mode (Mặc định)</Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={18} color={THEME.success} />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLead}>
              <Ionicons name="information-circle-outline" size={20} color={THEME.textDim} />
              <View>
                <Text style={styles.settingTitle}>Phiên bản (Version)</Text>
                <Text style={styles.settingSub}>FogChat Mobile 1.0.0 </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 7. Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={THEME.danger} />
          <Text style={styles.logoutText}>Đăng xuất khỏi tài khoản</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Upload Custom Emoji Modal */}
      <UploadCustomEmojiModal
        visible={showEmojiUpload}
        onClose={() => setShowEmojiUpload(false)}
      />

      {/* Admin Nhân sự & Phân quyền Modal */}
      <WorkspaceAdminModal
        visible={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusLg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
    padding: 3,
    borderWidth: 2,
    borderColor: THEME.primary,
    borderRadius: 46,
  },
  heroAvatar: {
    borderRadius: 40,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: THEME.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.surface,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: 0.5,
  },
  userHandle: {
    fontSize: 13,
    color: THEME.textDim,
    marginTop: 2,
  },
  userTitle: {
    fontSize: 13,
    color: THEME.primaryLight,
    fontWeight: '600',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
  },
  customStatusText: {
    fontSize: 11,
    color: THEME.textMuted,
    fontStyle: 'italic',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusMd,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.textDim,
    marginTop: 4,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: THEME.border,
  },
  sectionCard: {
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusMd,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  shortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shortcutTextWrap: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  shortcutSub: {
    fontSize: 11,
    color: THEME.textDim,
    marginTop: 2,
  },
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  inviteInfoWrap: {
    flex: 1,
    marginRight: 10,
  },
  inviteWsName: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primaryLight,
  },
  inviteCodeText: {
    fontSize: 13,
    color: THEME.text,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnSuccess: {
    backgroundColor: THEME.success,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B0E14',
  },
  copyBtnTextSuccess: {
    color: '#FFFFFF',
  },
  inviteHint: {
    fontSize: 11,
    color: THEME.textDim,
    marginTop: 8,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: THEME.textDim,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  settingSub: {
    fontSize: 11,
    color: THEME.textDim,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: THEME.radiusMd,
    padding: 14,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    color: THEME.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    paddingTop: 12,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.borderLight,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  modalErrorText: {
    color: THEME.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  editAvatarPicker: {
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarPickerOverlay: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatarPickerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  modalInputIcon: {
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    color: THEME.text,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  modalSubmitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B0E14',
  },
  statusOptionsList: {
    gap: 8,
  },
  statusOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 10,
  },
  statusOptionSelected: {
    borderColor: THEME.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  statusOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  statusOptionTextSelected: {
    color: THEME.primary,
  },
  quickStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    width: '100%',
  },
  quickStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.background,
  },
  quickStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickStatusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
  },
});
