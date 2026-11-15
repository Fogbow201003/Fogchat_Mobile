import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MediaViewerModal = ({
  visible,
  imageUrl,
  senderName,
  createdAt,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  if (!visible || !imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.overlay}>
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.metaInfo}>
            {senderName && (
              <Text style={styles.senderText} numberOfLines={1}>
                {senderName}
              </Text>
            )}
            {createdAt && (
              <Text style={styles.timeText} numberOfLines={1}>
                {new Date(createdAt).toLocaleString('vi-VN')}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Image Display */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
  },
  metaInfo: {
    flex: 1,
  },
  senderText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  timeText: {
    color: THEME.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});
