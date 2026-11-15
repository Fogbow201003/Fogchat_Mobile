import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

export const RegisterScreen = ({ navigation }) => {
  const { register, serverUrl, updateServer } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showServerModal, setShowServerModal] = useState(false);
  const [tempServerUrl, setTempServerUrl] = useState(serverUrl || '');

  useEffect(() => {
    if (serverUrl) setTempServerUrl(serverUrl);
  }, [serverUrl]);

  const handleSaveServer = async () => {
    if (tempServerUrl.trim()) {
      await updateServer(tempServerUrl.trim());
      setShowServerModal(false);
    }
  };

  // Real-time Password Security Criteria
  const passwordCriteria = useMemo(() => {
    return {
      hasLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=~`]/.test(password),
    };
  }, [password]);

  // Strength score: 0 to 5
  const strengthScore = useMemo(() => {
    return Object.values(passwordCriteria).filter(Boolean).length;
  }, [passwordCriteria]);

  const strengthMeta = useMemo(() => {
    if (!password) return { label: '', color: THEME.border, percent: 0 };
    if (strengthScore <= 2) return { label: 'Rất yếu', color: '#EF4444' };
    if (strengthScore === 3) return { label: 'Trung bình', color: '#F59E0B' };
    if (strengthScore === 4) return { label: 'Khá mạnh', color: '#06B6D4' };
    return { label: 'Rất mạnh', color: '#10B981' };
  }, [password, strengthScore]);

  const isPasswordValid = strengthScore >= 4 && passwordCriteria.hasLength;
  const isConfirmValid = confirmPassword.length > 0 && confirmPassword === password;

  const validateForm = () => {
    const showError = (msg) => {
      setErrorMessage(msg);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(`Thông tin chưa hợp lệ:\n${msg}`);
      } else {
        Alert.alert('Thông tin chưa hợp lệ', msg);
      }
      return false;
    };

    if (!name.trim()) {
      return showError('Vui lòng nhập Họ và tên');
    }
    const usernameClean = username.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameClean || !usernameRegex.test(usernameClean)) {
      return showError('Tên tài khoản (username) phải từ 3-20 ký tự, chỉ gồm chữ thường, số hoặc gạch dưới (_)');
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      return showError('Định dạng Email không hợp lệ (Ví dụ: user@example.com)');
    }
    if (password.length < 8) {
      return showError('Mật khẩu phải có tối thiểu 8 ký tự');
    }
    if (!passwordCriteria.hasUpper) {
      return showError('Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z)');
    }
    if (!passwordCriteria.hasLower) {
      return showError('Mật khẩu phải chứa ít nhất 1 chữ cái thường (a-z)');
    }
    if (!passwordCriteria.hasNumber) {
      return showError('Mật khẩu phải chứa ít nhất 1 chữ số (0-9)');
    }
    if (!passwordCriteria.hasSpecial) {
      return showError('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');
    }
    if (password !== confirmPassword) {
      return showError('Mật khẩu xác nhận không trùng khớp');
    }
    setErrorMessage('');
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert('Đăng ký tài khoản thành công! 🎉');
      } else {
        Alert.alert('Thành công 🎉', 'Tài khoản của bạn đã được khởi tạo thành công!');
      }
    } catch (err) {
      const errText = err.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!';
      setErrorMessage(errText);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(`Đăng ký không thành công:\n${errText}`);
      } else {
        Alert.alert('Đăng ký không thành công', errText);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={THEME.text} />
          <Text style={styles.backText}>Đăng nhập</Text>
        </TouchableOpacity>

        <View style={styles.brandBox}>
          <Text style={styles.brandTitle}>Đăng ký tài khoản</Text>
          <Text style={styles.brandSubtitle}>Hệ thống giao tiếp nội bộ bảo mật FogChat</Text>
        </View>

        <View style={styles.card}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>HỌ VÀ TÊN</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={THEME.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập họ và tên"
                placeholderTextColor={THEME.textPlaceholder}
                value={name}
                onChangeText={(val) => { setName(val); if (errorMessage) setErrorMessage(''); }}
              />
            </View>
          </View>

          {/* Username */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>TÊN TÀI KHOẢN (USERNAME)</Text>
              {username.length > 0 && (
                <Text style={/^[a-z0-9_]{3,20}$/.test(username.toLowerCase()) ? styles.validHint : styles.invalidHint}>
                  {/^[a-z0-9_]{3,20}$/.test(username.toLowerCase()) ? '✓ Hợp lệ' : '3-20 ký tự (a-z, 0-9, _)'}
                </Text>
              )}
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="at-outline" size={18} color={THEME.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập tên tài khoản"
                placeholderTextColor={THEME.textPlaceholder}
                value={username}
                onChangeText={(val) => { setUsername(val); if (errorMessage) setErrorMessage(''); }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL DOANH NGHIỆP</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={THEME.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập email"
                placeholderTextColor={THEME.textPlaceholder}
                value={email}
                onChangeText={(val) => { setEmail(val); if (errorMessage) setErrorMessage(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password with Strength Meter */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>MẬT KHẨU</Text>
              {password.length > 0 && (
                <Text style={[styles.strengthLabel, { color: strengthMeta.color }]}>
                  Độ mạnh: {strengthMeta.label}
                </Text>
              )}
            </View>
            <View style={[styles.inputWrapper, password.length > 0 && (isPasswordValid ? styles.inputValid : styles.inputWarning)]}>
              <Ionicons name="lock-closed-outline" size={18} color={THEME.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={THEME.textPlaceholder}
                value={password}
                onChangeText={(val) => { setPassword(val); if (errorMessage) setErrorMessage(''); }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={THEME.textDim}
                />
              </TouchableOpacity>
            </View>

            {/* Password Strength Bar */}
            {password.length > 0 && (
              <View style={styles.strengthBarContainer}>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <View
                    key={lvl}
                    style={[
                      styles.strengthSegment,
                      lvl <= strengthScore && { backgroundColor: strengthMeta.color },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Real-time Password Checklist */}
            <View style={styles.checklistGrid}>
              <View style={styles.checkItem}>
                <Ionicons
                  name={passwordCriteria.hasLength ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordCriteria.hasLength ? '#10B981' : THEME.textDim}
                />
                <Text style={[styles.checkText, passwordCriteria.hasLength && styles.checkTextActive]}>
                  Tối thiểu 8 ký tự
                </Text>
              </View>

              <View style={styles.checkItem}>
                <Ionicons
                  name={passwordCriteria.hasUpper && passwordCriteria.hasLower ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordCriteria.hasUpper && passwordCriteria.hasLower ? '#10B981' : THEME.textDim}
                />
                <Text style={[styles.checkText, passwordCriteria.hasUpper && passwordCriteria.hasLower && styles.checkTextActive]}>
                  Chữ hoa (A-Z) & chữ thường (a-z)
                </Text>
              </View>

              <View style={styles.checkItem}>
                <Ionicons
                  name={passwordCriteria.hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordCriteria.hasNumber ? '#10B981' : THEME.textDim}
                />
                <Text style={[styles.checkText, passwordCriteria.hasNumber && styles.checkTextActive]}>
                  Có ít nhất 1 số (0-9)
                </Text>
              </View>

              <View style={styles.checkItem}>
                <Ionicons
                  name={passwordCriteria.hasSpecial ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordCriteria.hasSpecial ? '#10B981' : THEME.textDim}
                />
                <Text style={[styles.checkText, passwordCriteria.hasSpecial && styles.checkTextActive]}>
                  Ký tự đặc biệt (!@#$%...)
                </Text>
              </View>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU</Text>
              {confirmPassword.length > 0 && (
                <Text style={isConfirmValid ? styles.validHint : styles.invalidHint}>
                  {isConfirmValid ? '✓ Trùng khớp' : '✗ Chưa trùng khớp'}
                </Text>
              )}
            </View>
            <View style={[styles.inputWrapper, confirmPassword.length > 0 && (isConfirmValid ? styles.inputValid : styles.inputError)]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={THEME.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={THEME.textPlaceholder}
                value={confirmPassword}
                onChangeText={(val) => { setConfirmPassword(val); if (errorMessage) setErrorMessage(''); }}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={THEME.textDim}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline Error Notice before submit button */}
          {!!errorMessage && (
            <View style={[styles.errorBox, { marginBottom: 12 }]}>
              <Ionicons name="alert-circle" size={18} color={THEME.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={THEME.gradientPrimary} style={styles.submitGradient}>
              {isLoading ? (
                <ActivityIndicator color="#0B0E14" size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.submitText}>TẠO TÀI KHOẢN BẢO MẬT</Text>
                  <Ionicons name="arrow-forward" size={18} color="#0B0E14" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Bottom Switch */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Đã có tài khoản FogChat?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server Config Button */}
        <TouchableOpacity
          style={styles.serverConfigBtn}
          onPress={() => setShowServerModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="server-outline" size={13} color={THEME.primaryLight} />
          {/* <Text style={styles.serverConfigText} numberOfLines={1}>
            Server: {serverUrl}
          </Text> */}
          <Ionicons name="settings-outline" size={12} color={THEME.textDim} />
        </TouchableOpacity>
      </ScrollView>

      {/* Server Config Modal */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Ionicons name="server" size={18} color={THEME.primary} />
                <Text style={styles.modalTitle}>Cấu hình Máy chủ (Backend)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <Ionicons name="close" size={20} color={THEME.textDim} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Để test trên điện thoại thật (Expo Go), nhập địa chỉ IP mạng LAN của máy tính chạy server (ví dụ: http://192.168.1.6:5000).
            </Text>

            {/* Quick Presets */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setTempServerUrl('http://localhost:5000')}
              >
                <Text style={styles.presetChipText}>Localhost (Web)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setTempServerUrl('http://192.168.1.6:5000')}
              >
                <Text style={styles.presetChipText}>Mạng LAN (192.168.1.6)</Text>
              </TouchableOpacity>
            </View>

            {/* URL Input */}
            <View style={styles.serverInputWrapper}>
              <TextInput
                style={styles.serverTextInput}
                value={tempServerUrl}
                onChangeText={setTempServerUrl}
                placeholder="http://192.168.1.x:5000"
                placeholderTextColor={THEME.textPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveServerBtn}
              onPress={handleSaveServer}
              activeOpacity={0.8}
            >
              <LinearGradient colors={THEME.gradientPrimary} style={styles.saveServerGradient}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.saveServerText}>Lưu & Áp dụng</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: THEME.radiusSm,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  backText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  brandBox: {
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusLg,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: THEME.radiusSm,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: THEME.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textDim,
    letterSpacing: 0.8,
  },
  validHint: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  invalidHint: {
    fontSize: 11,
    color: THEME.textDim,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputValid: {
    borderColor: '#10B981',
  },
  inputWarning: {
    borderColor: '#F59E0B',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: THEME.text,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.borderLight,
  },
  checklistGrid: {
    marginTop: 6,
    gap: 4,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: THEME.radiusSm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkText: {
    fontSize: 11,
    color: THEME.textDim,
  },
  checkTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 10,
    marginBottom: 16,
    borderRadius: THEME.radiusMd,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#0B0E14',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  footerText: {
    color: THEME.textDim,
    fontSize: 13,
  },
  loginLink: {
    color: THEME.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  serverConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
    maxWidth: '90%',
  },
  serverConfigText: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusLg,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.text,
  },
  modalDesc: {
    fontSize: 12,
    color: THEME.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primaryLight,
  },
  serverInputWrapper: {
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusSm,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  serverTextInput: {
    height: 44,
    color: THEME.text,
    fontSize: 13,
  },
  saveServerBtn: {
    height: 44,
    borderRadius: THEME.radiusSm,
    overflow: 'hidden',
  },
  saveServerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveServerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
