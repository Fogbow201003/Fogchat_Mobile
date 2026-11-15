import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { THEME } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Avatar';
import { Header } from '../../components/Header';
import { userApi, uploadApi, authApi } from '../../services/api';

const STATUS_LIST = [
  { key: 'ONLINE', label: 'Trực tuyến', color: '#10B981', icon: 'radio-button-on' },
  { key: 'AWAY', label: 'Vắng mặt', color: '#F59E0B', icon: 'time-outline' },
  { key: 'DND', label: 'Đừng làm phiền', color: '#EF4444', icon: 'remove-circle-outline' },
  { key: 'OFFLINE', label: 'Ngoại tuyến', color: '#6B7280', icon: 'radio-button-off' },
];

export const EditProfileScreen = ({ navigation }) => {
  const { user, updateUserData } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [status, setStatus] = useState(user?.status || 'ONLINE');
  const [customStatus, setCustomStatus] = useState(user?.customStatus || '');

  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Không khớp', 'Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setIsChangingPw(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Thành công', 'Mật khẩu của bạn đã được cập nhật!');
    } catch (err) {
      Alert.alert('Lỗi', err?.message || 'Không thể đổi mật khẩu.');
    } finally {
      setIsChangingPw(false);
    }
  };

  const webFileInputRef = useRef(null);

  const handlePickAvatar = async () => {
    if (Platform.OS === 'web') {
      webFileInputRef.current?.click();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setAvatarFile({
          uri: asset.uri,
          name: asset.uri.split('/').pop() || 'avatar.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('ImagePicker error:', err);
    }
  };

  const handleWebFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarUri(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập họ và tên hiển thị.');
      return;
    }

    setErrorMsg('');
    setIsSaving(true);

    try {
      let finalAvatarUrl = avatarUri;

      // Upload new avatar to Cloudinary if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const uploadRes = await uploadApi.uploadFile(formData);
        finalAvatarUrl = uploadRes.fileUrl || uploadRes.data?.fileUrl || avatarUri;
        if (finalAvatarUrl && finalAvatarUrl.startsWith('http://res.cloudinary.com')) {
          finalAvatarUrl = finalAvatarUrl.replace('http://', 'https://');
        }
      }

      // Update Profile
      const profileRes = await userApi.updateProfile({
        name: trimmedName,
        title: title.trim(),
        phone: phone.trim(),
        avatarUrl: finalAvatarUrl,
      });

      // Update Status
      const statusRes = await userApi.updateStatus({
        status,
        customStatus: customStatus.trim(),
      });

      // Sync state into AuthContext
      await updateUserData({
        ...(profileRes.user || profileRes),
        ...(statusRes.user || statusRes),
      });

      Alert.alert('Thành công', 'Hồ sơ của bạn đã được cập nhật!');
      navigation.goBack();
    } catch (err) {
      setErrorMsg(err.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Hidden Web Input */}
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={webFileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleWebFileChange}
        />
      )}

      {/* Header */}
      <Header
        title="Chỉnh sửa hồ sơ"
        subtitle={user?.email || 'Tài khoản cá nhân'}
        icon="person"
        onBack={() => navigation.goBack()}
        rightActions={
          <TouchableOpacity
            style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || isSaving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={name.trim() ? THEME.gradientPrimary : ['#222B3D', '#1A212E']}
              style={styles.saveGradient}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Lưu</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Error Banner */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={THEME.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* 1. Avatar Picker Hero */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickAvatar}
            activeOpacity={0.85}
          >
            <View style={styles.avatarRing}>
              <Avatar
                uri={avatarUri}
                name={name || user?.username}
                size={92}
              />
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarTip}>Chạm vào ảnh để thay đổi ảnh đại diện</Text>
        </View>

        {/* 2. Basic Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={16} color={THEME.primary} />
            <Text style={styles.cardTitle}>THÔNG TIN CƠ BẢN</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>HỌ VÀ TÊN HIỂN THỊ *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="VD: Nguyễn Văn A"
              placeholderTextColor={THEME.textPlaceholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CHỨC DANH / VỊ TRÍ CHUYÊN MÔN</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="VD: Frontend Engineer / QA Lead"
              placeholderTextColor={THEME.textPlaceholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SỐ ĐIỆN THOẠI LIÊN HỆ</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="VD: 0912345678"
              placeholderTextColor={THEME.textPlaceholder}
              keyboardType="phone-pad"
            />
          </View>

          {/* Read-only account credentials */}
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Tên tài khoản:</Text>
            <Text style={styles.readOnlyValue}>@{user?.username}</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Email:</Text>
            <Text style={styles.readOnlyValue}>{user?.email}</Text>
          </View>
        </View>

        {/* 3. Presence & Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="radio-button-on" size={16} color={THEME.primary} />
            <Text style={styles.cardTitle}>TRẠNG THÁI HOẠT ĐỘNG</Text>
          </View>

          {/* 4 Status Pills */}
          <View style={styles.statusGrid}>
            {STATUS_LIST.map((item) => {
              const isSelected = status === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.statusPill, isSelected && styles.statusPillSelected]}
                  onPress={() => setStatus(item.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.statusLabel, isSelected && styles.statusLabelSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Status Note */}
          <View style={[styles.inputGroup, { marginTop: 14 }]}>
            <Text style={styles.inputLabel}>TRẠNG THÁI TÙY CHỈNH</Text>
            <TextInput
              style={styles.textInput}
              value={customStatus}
              onChangeText={setCustomStatus}
              placeholder="VD: Đang họp, WFH, Nghỉ phép..."
              placeholderTextColor={THEME.textPlaceholder}
            />
          </View>
        </View>

        {/* 4. Change Password Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="lock-closed-outline" size={16} color={THEME.primary} />
            <Text style={styles.cardTitle}>ĐỔI MẬT KHẨU</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MẬT KHẨU HIỆN TẠI</Text>
            <TextInput
              style={styles.textInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Nhập mật khẩu hiện tại"
              placeholderTextColor={THEME.textPlaceholder}
              secureTextEntry
              maxLength={128}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MẬT KHẨU MỚI</Text>
            <TextInput
              style={styles.textInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Tối thiểu 6 ký tự"
              placeholderTextColor={THEME.textPlaceholder}
              secureTextEntry
              maxLength={128}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU MỚI</Text>
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor={THEME.textPlaceholder}
              secureTextEntry
              maxLength={128}
            />
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.14)',
              borderWidth: 1,
              borderColor: THEME.primary,
              borderRadius: 10,
              paddingVertical: 11,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              opacity: isChangingPw ? 0.6 : 1,
            }}
            onPress={handleChangePassword}
            disabled={isChangingPw}
            activeOpacity={0.8}
          >
            {isChangingPw ? (
              <ActivityIndicator size="small" color={THEME.primary} />
            ) : (
              <>
                <Ionicons name="key-outline" size={16} color={THEME.primary} />
                <Text style={{ color: THEME.primary, fontWeight: '700', fontSize: 13 }}>
                  Cập nhật mật khẩu
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  saveButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveGradient: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: THEME.danger,
    fontSize: 13,
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 6,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarRing: {
    padding: 3,
    borderRadius: 52,
    borderWidth: 2.5,
    borderColor: THEME.primary,
    backgroundColor: THEME.background,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.background,
  },
  avatarTip: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 8,
  },
  card: {
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusLg,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.text,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.divider,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: THEME.textDim,
  },
  readOnlyValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radiusFull,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statusPillSelected: {
    borderColor: THEME.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  statusLabelSelected: {
    color: THEME.primaryLight,
    fontWeight: '700',
  },
});
