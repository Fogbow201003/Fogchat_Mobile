import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { THEME } from '../../config/theme';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';

export const UploadCustomEmojiModal = ({ visible, onClose, onUploaded }) => {
  const { user } = useAuth();
  const { uploadCustomEmoji, deleteCustomEmoji, customEmojis = [], isWorkspaceAdmin, activeWorkspace } = useChat();

  const [name, setName] = useState('');
  const [shortcode, setShortcode] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUri, setPreviewUri] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const webFileInputRef = useRef(null);

  const handlePickImage = async () => {
    setError('');
    if (Platform.OS === 'web') {
      if (webFileInputRef.current) {
        webFileInputRef.current.click();
      }
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
        setPreviewUri(asset.uri);
        setSelectedImage({
          uri: asset.uri,
          name: asset.uri.split('/').pop() || 'custom_emoji.png',
          type: asset.mimeType || 'image/png',
        });
      }
    } catch (err) {
      console.warn('ImagePicker error:', err);
    }
  };

  const handleWebFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setPreviewUri(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setError('');
    const trimmedName = name.trim();
    const trimmedCode = shortcode.trim().replace(/^:+|:+$/g, '');

    if (!trimmedName) {
      setError('Vui lòng nhập tên biểu tượng (VD: Đang quẩy)');
      return;
    }
    if (!trimmedCode) {
      setError('Vui lòng nhập mã shortcode (VD: team_fire)');
      return;
    }
    if (!selectedImage) {
      setError('Vui lòng chọn hình ảnh biểu tượng');
      return;
    }

    setIsUploading(true);
    try {
      const fullShortcode = `:${trimmedCode}:`;
      await uploadCustomEmoji(trimmedName, fullShortcode, selectedImage);
      setName('');
      setShortcode('');
      setSelectedImage(null);
      setPreviewUri(null);
      onClose();
      if (onUploaded) onUploaded();
      Alert.alert('Thành công', `Đã thêm biểu tượng cảm xúc ${fullShortcode} vào Workspace!`);
    } catch (err) {
      setError(err.message || 'Không thể tải lên biểu tượng tùy chỉnh');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setShortcode('');
    setSelectedImage(null);
    setPreviewUri(null);
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.handleBar} />

              <View style={styles.header}>
                <View style={styles.titleWrap}>
                  <Text style={styles.title}>TẢI LÊN EMOJI WORKSPACE</Text>
                  <Text style={styles.subtitle}>
                    Không gian: {activeWorkspace?.name || 'Workspace'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={THEME.textDim} />
                </TouchableOpacity>
              </View>

              {/* Hidden file input on web */}
              {Platform.OS === 'web' && (
                <input
                  type="file"
                  ref={webFileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleWebFileChange}
                />
              )}

              {/* Error Banner */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={THEME.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Image Picker / Preview Box */}
              <TouchableOpacity
                style={styles.imagePickerBox}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                {previewUri ? (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri: previewUri }} style={styles.previewImg} />
                    <View style={styles.changeBadge}>
                      <Ionicons name="camera" size={12} color="#FFFFFF" />
                      <Text style={styles.changeBadgeText}>Đổi ảnh</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <View style={styles.pickerIconBox}>
                      <Ionicons name="image-outline" size={28} color={THEME.primary} />
                    </View>
                    <Text style={styles.pickerTitle}>Chọn hình ảnh Emoji</Text>
                    <Text style={styles.pickerSub}>Hỗ trợ PNG, JPG, GIF (Khuyến nghị 128x128px vuông)</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Name Input */}
              <Text style={styles.label}>TÊN EMOJI</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="text-outline" size={18} color={THEME.primary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Lửa Đang Cháy, Mèo Chúc Mừng..."
                  placeholderTextColor={THEME.textPlaceholder}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Shortcode Input */}
              <Text style={styles.label}>MÃ SHORTCODE (ĐỂ GỢI Ý KHI GÕ :)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="pricetag-outline" size={18} color={THEME.secondary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="team_fire, cat_party..."
                  placeholderTextColor={THEME.textPlaceholder}
                  value={shortcode}
                  onChangeText={setShortcode}
                  autoCapitalize="none"
                />
              </View>

              {/* Live Preview Pill */}
              {shortcode.trim().length > 0 && (
                <View style={styles.livePreviewBar}>
                  <Text style={styles.livePreviewLabel}>Xem trước mã gõ:</Text>
                  <View style={styles.liveCodeBadge}>
                    <Text style={styles.liveCodeText}>
                      :{shortcode.trim().replace(/^:+|:+$/g, '')}:
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.uploadBtn, (!selectedImage || !name.trim() || !shortcode.trim() || isUploading) && styles.uploadBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!selectedImage || !name.trim() || !shortcode.trim() || isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#0B0E14" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={16} color="#0B0E14" style={{ marginRight: 6 }} />
                      <Text style={styles.uploadBtnText}>Tải lên Workspace</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Danh sách Custom Emoji hiện có (Cho phép Admin hoặc người tạo xóa) */}
              {customEmojis.length > 0 && (
                <View style={styles.existingSection}>
                  <Text style={styles.existingTitle}>EMOJI HIỆN CÓ ({customEmojis.length})</Text>
                  <ScrollView style={styles.existingList} nestedScrollEnabled>
                    {customEmojis.map((em) => {
                      const canDelete = isWorkspaceAdmin || (em.createdById && em.createdById === user?.id);
                      const imgSrc = em.imageUrl?.startsWith('http://res.cloudinary.com')
                        ? em.imageUrl.replace('http://', 'https://')
                        : em.imageUrl;
                      return (
                        <View key={em.id} style={styles.existingItem}>
                          <Image source={{ uri: imgSrc }} style={styles.existingImg} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.existingName} numberOfLines={1}>{em.name}</Text>
                            <Text style={styles.existingCode}>{em.shortcode}</Text>
                          </View>
                          {canDelete && (
                            <TouchableOpacity
                              style={styles.deleteEmojiBtn}
                              onPress={() => {
                                Alert.alert(
                                  'Xóa Emoji',
                                  `Bạn có chắc muốn xóa ${em.shortcode} khỏi Workspace?`,
                                  [
                                    { text: 'Hủy', style: 'cancel' },
                                    {
                                      text: 'Xóa',
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          await deleteCustomEmoji(em.id);
                                        } catch (err) {
                                          Alert.alert('Lỗi', err?.message || 'Không thể xóa emoji');
                                        }
                                      }
                                    }
                                  ]
                                );
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  card: {
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
  imagePickerBox: {
    backgroundColor: THEME.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: THEME.border,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewWrap: {
    alignItems: 'center',
  },
  previewImg: {
    width: 72,
    height: 72,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  changeBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pickerPlaceholder: {
    alignItems: 'center',
  },
  pickerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 2,
  },
  pickerSub: {
    fontSize: 11,
    color: THEME.textDim,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: THEME.text,
    fontSize: 14,
  },
  livePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  livePreviewLabel: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  liveCodeBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  liveCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
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
  uploadBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnDisabled: {
    opacity: 0.4,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B0E14',
  },
  existingSection: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 14,
  },
  existingTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  existingList: {
    maxHeight: 160,
  },
  existingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
  },
  existingImg: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  existingName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
  },
  existingCode: {
    fontSize: 11,
    color: THEME.primary,
  },
  deleteEmojiBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
