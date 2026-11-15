import React, { useState } from 'react';
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

export const CreateChannelModal = ({ visible, onClose, onCreated }) => {
  const { createChannel, activeWorkspace } = useChat();

  const [name, setName] = useState('');
  const [type, setType] = useState('PUBLIC'); // 'PUBLIC' | 'PRIVATE'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setError('');
    setName('');
    setType('PUBLIC');
    onClose();
  };

  const handleCreate = async () => {
    setError('');
    if (!activeWorkspace) {
      setError('Chưa có Không gian làm việc (Workspace). Vui lòng tạo Workspace trước khi tạo kênh.');
      return;
    }
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleanName) {
      setError('Vui lòng nhập tên kênh (ví dụ: general, thong-bao...)');
      return;
    }

    setIsLoading(true);
    try {
      const newChan = await createChannel({ name: cleanName, type });
      setName('');
      setType('PUBLIC');
      setError('');
      onClose();
      if (onCreated) onCreated(newChan);
    } catch (err) {
      setError(err.message || 'Không thể tạo kênh. Vui lòng kiểm tra lại kết nối server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>Tạo Kênh Mới</Text>
              <Text style={styles.subtitle}>
                {activeWorkspace ? `Không gian: ${activeWorkspace.name}` : '⚠️ Chưa chọn Workspace'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={THEME.textDim} />
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {(!activeWorkspace || !!error) && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={THEME.danger} />
              <Text style={styles.errorText}>
                {error || 'Bạn chưa có Không gian làm việc. Hãy đóng bảng này và tạo Workspace trước!'}
              </Text>
            </View>
          )}

          {/* Channel Name */}
          <Text style={styles.label}>TÊN KÊNH</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.prefix}>#</Text>
            <TextInput
              style={styles.input}
              placeholder="ten-kenh-moi (vd: du-an-x)"
              placeholderTextColor={THEME.textPlaceholder}
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Channel Type Selector */}
          <Text style={styles.label}>LOẠI KÊNH</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeCard, type === 'PUBLIC' && styles.typeCardActive]}
              onPress={() => setType('PUBLIC')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="globe-outline"
                size={22}
                color={type === 'PUBLIC' ? THEME.primary : THEME.textDim}
              />
              <View style={styles.typeTextWrap}>
                <Text style={[styles.typeTitle, type === 'PUBLIC' && styles.typeTitleActive]}>
                  Công khai (Public)
                </Text>
                <Text style={styles.typeDesc}>Mọi thành viên đều có thể thấy và tham gia</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeCard, type === 'PRIVATE' && styles.typeCardActive]}
              onPress={() => setType('PRIVATE')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="lock-closed-outline"
                size={22}
                color={type === 'PRIVATE' ? THEME.primary : THEME.textDim}
              />
              <View style={styles.typeTextWrap}>
                <Text style={[styles.typeTitle, type === 'PRIVATE' && styles.typeTitleActive]}>
                  Riêng tư (Private)
                </Text>
                <Text style={styles.typeDesc}>Chỉ thành viên được mời mới có thể vào</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
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
                <Text style={styles.createText}>Tạo Kênh</Text>
              )}
            </TouchableOpacity>
          </View>
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
    paddingTop: 18,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: THEME.textDim,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: THEME.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
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
    fontWeight: '700',
    color: THEME.textDim,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  prefix: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.primary,
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: 44,
    color: THEME.text,
    fontSize: 15,
  },
  typeRow: {
    gap: 10,
    marginBottom: 20,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    gap: 12,
  },
  typeCardActive: {
    borderColor: THEME.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  typeTextWrap: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  typeTitleActive: {
    color: THEME.primaryLight,
  },
  typeDesc: {
    fontSize: 11,
    color: THEME.textDim,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelText: {
    color: THEME.textDim,
    fontWeight: '700',
  },
  createBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: THEME.radiusSm,
  },
  createBtnDisabled: {
    backgroundColor: THEME.borderLight,
  },
  createText: {
    color: '#0B0E14',
    fontWeight: '800',
  },
});
