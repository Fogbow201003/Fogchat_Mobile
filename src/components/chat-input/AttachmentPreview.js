import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';

export const AttachmentPreview = ({ file, previewUrl, onRemove }) => {
  if (!file) return null;

  return (
    <View style={styles.container}>
      {previewUrl && (
        <Image source={{ uri: previewUrl }} style={styles.thumbnail} />
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name || 'Ảnh đính kèm'}
        </Text>
        <Text style={styles.meta}>Sẵn sàng gửi</Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn} activeOpacity={0.7}>
        <Ionicons name="close-circle" size={20} color={THEME.danger} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.primary,
    padding: 8,
    marginBottom: 8,
    gap: 10,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: THEME.radiusSm,
    backgroundColor: '#000',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  meta: {
    fontSize: 11,
    color: THEME.textDim,
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
});
