import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Avatar';

export const WorkspaceAdminModal = ({ visible, onClose }) => {
  const { user } = useAuth();
  const {
    workspaces = [],
    activeWorkspace,
    setActiveWorkspace,
    workspaceMembers,
    updateMemberRole,
    provisionWorkspaceUser,
    getAvailableWorkspaceUsers,
    addWorkspaceMembers,
    toggleMemberActiveStatus,
    regenerateInviteCode,
    deleteWorkspace,
  } = useChat();

  const adminWorkspaces = workspaces.filter((w) => w.role === 'ADMIN');

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'provision'
  const [busyUserId, setBusyUserId] = useState(null);

  // Add existing users state
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [addExistingRole, setAddExistingRole] = useState('MEMBER');
  const [existingSearch, setExistingSearch] = useState('');
  const [isAddingExisting, setIsAddingExisting] = useState(false);

  const loadAvailableUsers = useCallback(async () => {
    setIsLoadingAvailable(true);
    try {
      const list = await getAvailableWorkspaceUsers();
      setAvailableUsers(list || []);
    } catch (err) {
      Alert.alert('Lỗi', err?.message || 'Không thể tải danh sách nhân sự');
    } finally {
      setIsLoadingAvailable(false);
    }
  }, [getAvailableWorkspaceUsers]);

  useEffect(() => {
    if (visible && showAddExisting && activeWorkspace?.id) {
      setSelectedUserIds([]);
      loadAvailableUsers();
    }
  }, [visible, showAddExisting, activeWorkspace?.id, loadAvailableUsers]);

  useEffect(() => {
    if (!visible) {
      setShowAddExisting(false);
      setSelectedUserIds([]);
      setExistingSearch('');
    }
  }, [visible]);

  const toggleSelectExistingUser = (uid) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleConfirmAddExisting = async () => {
    if (selectedUserIds.length === 0) {
      Alert.alert('Chưa chọn nhân sự', 'Vui lòng chọn ít nhất một tài khoản để thêm.');
      return;
    }
    setIsAddingExisting(true);
    try {
      const added = await addWorkspaceMembers(selectedUserIds, addExistingRole);
      Alert.alert('Thành công', `Đã thêm ${added.length || selectedUserIds.length} nhân sự vào ${activeWorkspace?.name}!`);
      setShowAddExisting(false);
      setSelectedUserIds([]);
      setExistingSearch('');
    } catch (err) {
      Alert.alert('Lỗi', err?.message || 'Không thể thêm nhân sự vào Workspace');
    } finally {
      setIsAddingExisting(false);
    }
  };

  const filteredAvailableUsers = availableUsers.filter((u) => {
    const q = existingSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  // Provision form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [isCreating, setIsCreating] = useState(false);

  const handleToggleLock = (member) => {
    const nextActive = member.isActive === false;
    Alert.alert(
      nextActive ? 'Mở khóa tài khoản' : 'Khóa tài khoản tức thì',
      nextActive
        ? `Cho phép ${member.name || member.username} đăng nhập lại vào hệ thống?`
        : `Tài khoản ${member.name || member.username} sẽ bị đăng xuất ngay lập tức khỏi mọi thiết bị và không thể truy cập tin nhắn nội bộ.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: nextActive ? 'Mở khóa' : 'Khóa ngay',
          style: nextActive ? 'default' : 'destructive',
          onPress: async () => {
            setBusyUserId(member.id);
            try {
              await toggleMemberActiveStatus(member.id, nextActive);
            } catch (err) {
              Alert.alert('Lỗi', err?.message || 'Không thể cập nhật trạng thái tài khoản');
            } finally {
              setBusyUserId(null);
            }
          },
        },
      ]
    );
  };

  const handleToggleRole = async (member) => {
    const nextRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    setBusyUserId(member.id);
    try {
      await updateMemberRole(member.id, nextRole);
    } catch (err) {
      Alert.alert('Lỗi', err?.message || 'Không thể đổi vai trò');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleProvision = async () => {
    if (!email.trim() || !password || password.length < 6) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Email và Mật khẩu tạm tối thiểu 6 ký tự.');
      return;
    }
    setIsCreating(true);
    try {
      await provisionWorkspaceUser({
        name: name.trim(),
        email: email.trim(),
        password,
        title: title.trim(),
        role,
      });
      Alert.alert('Thành công', `Đã cấp tài khoản nội bộ cho ${email.trim()}!`);
      setName('');
      setEmail('');
      setPassword('');
      setTitle('');
      setRole('MEMBER');
      setActiveTab('members');
    } catch (err) {
      Alert.alert('Lỗi', err?.message || 'Không thể tạo tài khoản');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>QUẢN TRỊ NHÂN SỰ</Text>
              <Text style={styles.subtitle}>
                {activeWorkspace?.name || 'Workspace'} • Bảo mật & Cấp phát nội bộ
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Workspace Switcher for multi-workspace Admins */}
          {adminWorkspaces.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 10 }}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
            >
              {adminWorkspaces.map((ws) => {
                const isSelected = ws.id === activeWorkspace?.id;
                return (
                  <TouchableOpacity
                    key={ws.id}
                    onPress={() => setActiveWorkspace(ws)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isSelected ? THEME.primary : THEME.border,
                      backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.14)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? THEME.primary : THEME.textMuted,
                      }}
                    >
                      {ws.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'members' && styles.tabBtnActive]}
              onPress={() => setActiveTab('members')}
            >
              <Ionicons
                name="people"
                size={15}
                color={activeTab === 'members' ? THEME.primary : THEME.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
                Nhân sự ({workspaceMembers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'provision' && styles.tabBtnActive]}
              onPress={() => setActiveTab('provision')}
            >
              <Ionicons
                name="person-add"
                size={15}
                color={activeTab === 'provision' ? THEME.primary : THEME.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'provision' && styles.tabTextActive]}>
                Cấp tài khoản mới
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'members' ? (
            <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Toggle Add Existing System Users Panel */}
              <TouchableOpacity
                style={[styles.addExistingToggleBtn, showAddExisting && styles.addExistingToggleBtnActive]}
                onPress={() => setShowAddExisting((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={showAddExisting ? 'chevron-up-circle-outline' : 'person-add-outline'}
                  size={17}
                  color={THEME.primary}
                />
                <Text style={styles.addExistingToggleText}>
                  {showAddExisting ? 'Thu gọn danh sách thêm nhân sự' : 'Thêm nhân sự đã có tài khoản'}
                </Text>
              </TouchableOpacity>

              {showAddExisting && (
                <View style={styles.addExistingBox}>
                  <Text style={styles.addExistingHeading}>
                    CHỌN TÀI KHOẢN CHƯA VÀO "{activeWorkspace?.name}"
                  </Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 10, paddingVertical: 8 }]}
                    placeholder="Tìm theo tên, @username hoặc email..."
                    placeholderTextColor={THEME.textDim}
                    value={existingSearch}
                    onChangeText={setExistingSearch}
                    autoCapitalize="none"
                  />

                  {isLoadingAvailable ? (
                    <ActivityIndicator size="small" color={THEME.primary} style={{ marginVertical: 14 }} />
                  ) : filteredAvailableUsers.length === 0 ? (
                    <Text style={styles.emptyAvailableText}>
                      Không còn tài khoản khả dụng nào ngoài các thành viên hiện tại.
                    </Text>
                  ) : (
                    <View style={{ gap: 6, marginBottom: 10 }}>
                      {filteredAvailableUsers.map((u) => {
                        const isChecked = selectedUserIds.includes(u.id);
                        return (
                          <TouchableOpacity
                            key={u.id}
                            style={[styles.availUserRow, isChecked && styles.availUserRowSelected]}
                            onPress={() => toggleSelectExistingUser(u.id)}
                            activeOpacity={0.75}
                          >
                            <Ionicons
                              name={isChecked ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={isChecked ? THEME.primary : THEME.textDim}
                            />
                            <Avatar uri={u.avatarUrl} name={u.name || u.username} size={32} showStatus={false} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.availUserName} numberOfLines={1}>
                                {u.name || u.username}
                              </Text>
                              <Text style={styles.availUserSub} numberOfLines={1}>
                                @{u.username} • {u.email}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {filteredAvailableUsers.length > 0 && (
                    <>
                      <View style={styles.rolePickRow}>
                        {['MEMBER', 'ADMIN'].map((r) => (
                          <TouchableOpacity
                            key={r}
                            style={[styles.roleOption, { paddingVertical: 8 }, addExistingRole === r && styles.roleOptionActive]}
                            onPress={() => setAddExistingRole(r)}
                          >
                            <Text style={[styles.roleOptionText, addExistingRole === r && styles.roleOptionTextActive]}>
                              {r === 'ADMIN' ? 'Vai trò ADMIN' : 'Vai trò MEMBER'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.submitBtn,
                          { marginTop: 12, height: 42 },
                          (selectedUserIds.length === 0 || isAddingExisting) && { opacity: 0.55 },
                        ]}
                        disabled={selectedUserIds.length === 0 || isAddingExisting}
                        onPress={handleConfirmAddExisting}
                      >
                        {isAddingExisting ? (
                          <ActivityIndicator size="small" color="#0B0E14" />
                        ) : (
                          <Text style={styles.submitBtnText}>
                            Thêm {selectedUserIds.length > 0 ? `(${selectedUserIds.length}) ` : ''}vào Workspace
                          </Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {workspaceMembers.map((member) => {
                const isSelf = member.id === user?.id;
                const isLocked = member.isActive === false;
                const isBusy = busyUserId === member.id;

                return (
                  <View key={member.id} style={[styles.memberCard, isLocked && styles.memberCardLocked]}>
                    <Avatar
                      uri={member.avatarUrl}
                      name={member.name || member.username}
                      size={42}
                      showStatus={false}
                    />
                    <View style={styles.memberInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {member.name || member.username}
                        </Text>
                        {member.role === 'ADMIN' && (
                          <View style={styles.adminBadge}>
                            <Text style={styles.adminBadgeText}>ADMIN</Text>
                          </View>
                        )}
                        {isLocked && (
                          <View style={styles.lockedBadge}>
                            <Text style={styles.lockedBadgeText}>ĐÃ KHÓA</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberEmail} numberOfLines={1}>
                        {member.email || `@${member.username}`}
                        {member.title ? ` • ${member.title}` : ''}
                      </Text>

                      {!isSelf && (
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={styles.smallBtn}
                            onPress={() => handleToggleRole(member)}
                            disabled={isBusy}
                          >
                            <Ionicons name="shield-outline" size={13} color={THEME.primary} />
                            <Text style={styles.smallBtnText}>
                              {member.role === 'ADMIN' ? 'Hạ xuống Member' : 'Nâng lên Admin'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallBtn, isLocked ? styles.unlockBtn : styles.lockBtn]}
                            onPress={() => handleToggleLock(member)}
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              <ActivityIndicator size="small" color={THEME.text} />
                            ) : (
                              <>
                                <Ionicons
                                  name={isLocked ? 'lock-open-outline' : 'lock-closed-outline'}
                                  size={13}
                                  color={isLocked ? '#10B981' : '#EF4444'}
                                />
                                <Text
                                  style={[
                                    styles.smallBtnText,
                                    { color: isLocked ? '#10B981' : '#EF4444' },
                                  ]}
                                >
                                  {isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Workspace Management: Refresh Invite Code & Delete Workspace */}
              <View style={styles.dangerSection}>
                <Text style={styles.dangerHeader}>QUẢN TRỊ KHÔNG GIAN LÀM VIỆC</Text>
                <TouchableOpacity
                  style={styles.regenCodeBtn}
                  onPress={async () => {
                    try {
                      const code = await regenerateInviteCode(activeWorkspace?.id);
                      Alert.alert('Thành công', `Mã mời mới: ${code}`);
                    } catch (err) {
                      Alert.alert('Lỗi', err?.message || 'Không thể đổi mã mời');
                    }
                  }}
                >
                  <Ionicons name="refresh" size={16} color={THEME.primary} />
                  <Text style={styles.regenCodeText}>Tạo lại mã mời mới ({activeWorkspace?.inviteCode})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteWsBtn}
                  onPress={() => {
                    Alert.alert(
                      'Xóa Không gian làm việc',
                      `Bạn có chắc chắn muốn xóa vĩnh viễn "${activeWorkspace?.name}" cùng toàn bộ kênh và tin nhắn?`,
                      [
                        { text: 'Hủy', style: 'cancel' },
                        {
                          text: 'Xóa vĩnh viễn',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deleteWorkspace(activeWorkspace?.id);
                              onClose();
                            } catch (err) {
                              Alert.alert('Lỗi', err?.message || 'Không thể xóa Workspace');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deleteWsText}>Xóa vĩnh viễn Workspace này</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.label}>HỌ VÀ TÊN NHÂN SỰ</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập họ và tên"
                placeholderTextColor={THEME.textDim}
                value={name}
                onChangeText={setName}
                maxLength={60}
              />

              <Text style={styles.label}>EMAIL ĐĂNG NHẬP NỘI BỘ *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email"
                placeholderTextColor={THEME.textDim}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
              />

              <Text style={styles.label}>MẬT KHẨU TẠM (TỐI THIỂU 6 KÝ TỰ) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu tạm"
                placeholderTextColor={THEME.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                maxLength={64}
              />

              <Text style={styles.label}>CHỨC DANH / PHÒNG BAN</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập chức danh / phòng ban"
                placeholderTextColor={THEME.textDim}
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />

              <Text style={styles.label}>VAI TRÒ TRONG WORKSPACE</Text>
              <View style={styles.rolePickRow}>
                {['MEMBER', 'ADMIN'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, role === r && styles.roleOptionActive]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextActive]}>
                      {r === 'ADMIN' ? 'Quản trị viên (ADMIN)' : 'Thành viên (MEMBER)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, isCreating && { opacity: 0.6 }]}
                onPress={handleProvision}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#0B0E14" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#0B0E14" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Tạo & Cấp tài khoản ngay</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    maxHeight: '88%',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.borderLight,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: THEME.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: THEME.surfaceElevated,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  tabTextActive: {
    color: THEME.primary,
    fontWeight: '700',
  },
  body: {
    maxHeight: 460,
  },
  memberCard: {
    flexDirection: 'row',
    backgroundColor: THEME.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 10,
  },
  memberCardLocked: {
    opacity: 0.72,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  adminBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primary,
  },
  lockedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  memberEmail: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  lockBtn: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  unlockBtn: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: THEME.text,
    fontSize: 14,
  },
  rolePickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.background,
    alignItems: 'center',
  },
  roleOptionActive: {
    borderColor: THEME.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.14)',
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  roleOptionTextActive: {
    color: THEME.primary,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: 20,
    backgroundColor: THEME.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B0E14',
  },
  dangerSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 10,
  },
  dangerHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 0.7,
  },
  regenCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  regenCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  deleteWsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteWsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  addExistingToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.45)',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    marginBottom: 12,
  },
  addExistingToggleBtnActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
  },
  addExistingToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  addExistingBox: {
    backgroundColor: THEME.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    marginBottom: 14,
  },
  addExistingHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyAvailableText: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  availUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  availUserRowSelected: {
    borderColor: THEME.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  availUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  availUserSub: {
    fontSize: 11,
    color: THEME.textMuted,
  },
});
