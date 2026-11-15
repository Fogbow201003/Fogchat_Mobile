import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { useChat } from '../../context/ChatContext';

export const CreateWorkspaceModal = ({ visible, onClose, onCreated, initialMode = 'create' }) => {
  const { createWorkspace, joinWorkspaceByCode, workspaces = [] } = useChat();
  const canCreateWorkspace = workspaces.length === 0 || workspaces.some((w) => w.role === 'ADMIN');

  const [mode, setMode] = useState(canCreateWorkspace ? initialMode : 'join'); // 'create' | 'join'
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync mode whenever initialMode or visible changes
  useEffect(() => {
    if (visible) {
      setMode(canCreateWorkspace ? (initialMode || 'create') : 'join');
      setError('');
    }
  }, [visible, initialMode, canCreateWorkspace]);

  const handleClose = () => {
    setError('');
    setName('');
    setInviteCode('');
    onClose();
  };

  const handleCreate = async () => {
    setError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên Không gian làm việc');
      return;
    }

    setIsLoading(true);
    try {
      const newWs = await createWorkspace(trimmed);
      setName('');
      setError('');
      onClose();
      if (onCreated) onCreated(newWs);
      Alert.alert('Thành công', `Đã tạo Không gian làm việc "${newWs.name}"!`);
    } catch (err) {
      setError(err.message || 'Không thể tạo Workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    setError('');
    const trimmed = inviteCode.trim();
    if (!trimmed) {
      setError('Vui lòng nhập mã mời (Invite Code)');
      return;
    }

    setIsLoading(true);
    try {
      const joinedWs = await joinWorkspaceByCode(trimmed);
      setInviteCode('');
      setError('');
      onClose();
      if (onCreated) onCreated(joinedWs);
      Alert.alert('Thành công', `Bạn đã tham gia Không gian làm việc "${joinedWs.name || 'Workspace'}"!`);
    } catch (err) {
      setError(err.message || 'Mã mời không hợp lệ hoặc đã hết hạn');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>
                {mode === 'create' ? 'Tạo Không Gian Mới' : 'Tham Gia Bằng Mã Mời'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'create'
                  ? 'Tổ chức các kênh và dự án của bạn'
                  : 'Gia nhập Workspace của đồng nghiệp thông qua mã chia sẻ'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={THEME.textDim} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            {canCreateWorkspace && (
              <TouchableOpacity
                style={[styles.tabItem, mode === 'create' && styles.tabItemActive]}
                onPress={() => {
                  setMode('create');
                  setError('');
                }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={mode === 'create' ? THEME.primary : THEME.textDim}
                />
                <Text style={[styles.tabText, mode === 'create' && styles.tabTextActive]}>
                  Tạo mới
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.tabItem, mode === 'join' && styles.tabItemActive]}
              onPress={() => {
                setMode('join');
                setError('');
              }}
            >
              <Ionicons
                name="enter-outline"
                size={16}
                color={mode === 'join' ? THEME.primary : THEME.textDim}
              />
              <Text style={[styles.tabText, mode === 'join' && styles.tabTextActive]}>
                Nhập mã mời
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={THEME.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {mode === 'create' ? (
            <>
              <Text style={styles.label}>TÊN WORKSPACE</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="briefcase-outline" size={18} color={THEME.primary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: FogTech, Team Dự Án..."
                  placeholderTextColor={THEME.textPlaceholder}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.createBtn, (!name.trim() || isLoading) && styles.createBtnDisabled]}
                  onPress={handleCreate}
                  disabled={!name.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0B0E14" size="small" />
                  ) : (
                    <Text style={styles.createText}>Tạo Workspace</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>MÃ MỜI WORKSPACE (UUID)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="key-outline" size={18} color={THEME.secondary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Dán mã mời vào đây..."
                  placeholderTextColor={THEME.textPlaceholder}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.createBtn, (!inviteCode.trim() || isLoading) && styles.createBtnDisabled]}
                  onPress={handleJoin}
                  disabled={!inviteCode.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0B0E14" size="small" />
                  ) : (
                    <Text style={styles.createText}>Tham Gia Ngay</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: THEME.radiusLg,
    borderTopRightRadius: THEME.radiusLg,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textDim,
  },
  tabTextActive: {
    color: THEME.primary,
  },
  errorBox: {
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
  errorText: {
    color: THEME.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: THEME.text,
    fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: THEME.radiusMd,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  createBtn: {
    flex: 2,
    height: 48,
    borderRadius: THEME.radiusMd,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B0E14',
  },
});
