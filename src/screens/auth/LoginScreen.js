import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    setErrorMessage('');

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      setEmailError('Vui lòng nhập địa chỉ Email');
      valid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Định dạng Email không hợp lệ');
      valid = false;
    }

    if (!password) {
      setPasswordError('Vui lòng nhập Mật khẩu');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Mật khẩu phải có tối thiểu 6 ký tự');
      valid = false;
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(email.trim(), password);
    } catch (err) {
      const errText = err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản!';
      setErrorMessage(errText);
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
        {/* Brand Logo & Title */}
        <View style={styles.brandBox}>
          <LinearGradient colors={THEME.gradientPrimary} style={styles.logoBadge}>
            <Ionicons name="chatbubbles" size={38} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.brandTitle}>FogChat</Text>
          <Text style={styles.brandSubtitle}>Hệ thống giao tiếp nội bộ thời gian thực</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ĐĂNG NHẬP</Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL DOANH NGHIỆP</Text>
            <View style={[styles.inputWrapper, !!emailError && styles.inputWrapperError]}>
              <Ionicons name="mail-outline" size={18} color={emailError ? THEME.danger : THEME.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập email"
                placeholderTextColor={THEME.textPlaceholder}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailError) setEmailError('');
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                maxLength={100}
              />
              {email.length > 0 && (
                <TouchableOpacity onPress={() => setEmail('')}>
                  <Ionicons name="close-circle" size={16} color={THEME.textDim} />
                </TouchableOpacity>
              )}
            </View>
            {!!emailError && <Text style={styles.fieldErrorText}>{emailError}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MẬT KHẨU</Text>
            <View style={[styles.inputWrapper, !!passwordError && styles.inputWrapperError]}>
              <Ionicons name="lock-closed-outline" size={18} color={passwordError ? THEME.danger : THEME.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={THEME.textPlaceholder}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError('');
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                maxLength={64}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={THEME.textDim}
                />
              </TouchableOpacity>
            </View>
            {!!passwordError && <Text style={styles.fieldErrorText}>{passwordError}</Text>}
          </View>

          {/* Server / General Error Banner */}
          {!!errorMessage && (
            <View style={[styles.errorBox, { marginBottom: 12 }]}>
              <Ionicons name="alert-circle" size={18} color={THEME.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={THEME.gradientPrimary} style={styles.submitGradient}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitText}>ĐĂNG NHẬP</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Enterprise Provisioning Notice */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Tài khoản do Quản trị viên nội bộ cấp phát</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 36,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.text,
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 13,
    color: THEME.textDim,
    marginTop: 4,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusLg,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 1.2,
    marginBottom: 18,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: THEME.radiusSm,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    color: THEME.danger,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textDim,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: THEME.danger,
  },
  fieldErrorText: {
    fontSize: 12,
    color: THEME.danger,
    fontWeight: '600',
    marginTop: 5,
    marginLeft: 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 46,
    color: THEME.text,
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    borderRadius: THEME.radiusMd,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: {
    fontSize: 13,
    color: THEME.textDim,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primaryLight,
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
