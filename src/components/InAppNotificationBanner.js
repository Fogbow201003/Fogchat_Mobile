import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../config/theme';
import { Avatar } from './Avatar';
import { useChat } from '../context/ChatContext';

export const InAppNotificationBanner = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { inAppNotification, dismissNotification, setActiveChannel, channels } = useChat();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (inAppNotification) {
      // Clear previous timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // Slide in from top
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4500ms
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, 4500);
    } else {
      handleDismiss();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inAppNotification]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissNotification();
    });
  };

  const handlePress = () => {
    if (!inAppNotification) return;

    const notif = inAppNotification;
    handleDismiss();

    if (!navigation) return;

    if (notif.type === 'thread') {
      navigation.navigate('Thread', {
        parentMessage: notif.parentMessage || { id: notif.parentId },
        channelName: notif.channel?.name || 'kênh',
      });
    } else {
      const targetChan = channels.find(c => c.id === notif.channelId) || notif.channel;
      if (targetChan) {
        setActiveChannel(targetChan);
      }
      navigation.navigate('ChatRoom', {
        channelId: notif.channelId,
        channelName: notif.type === 'dm'
          ? (notif.title || 'Tin nhắn riêng')
          : (notif.channel?.name || notif.title),
        isDirect: notif.type === 'dm',
      });
    }
  };

  if (!inAppNotification) return null;

  const isThread = inAppNotification.type === 'thread';
  const isDirect = inAppNotification.type === 'dm';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 10) + 4,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.bannerCard,
          isThread && styles.bannerCardThread,
          isDirect && styles.bannerCardDirect,
        ]}
        onPress={handlePress}
        activeOpacity={0.88}
      >
        {/* Glow Accent Line on Top */}
        <View
          style={[
            styles.accentBar,
            isThread ? styles.accentBarThread : (isDirect ? styles.accentBarDirect : styles.accentBarCyan),
          ]}
        />

        <View style={styles.contentRow}>
          {/* Sender Avatar */}
          <View style={styles.avatarWrap}>
            <Avatar
              uri={inAppNotification.avatarUrl}
              name={inAppNotification.title}
              size={38}
              showStatus={false}
            />
            <View
              style={[
                styles.typeIconBadge,
                isThread ? styles.badgeThread : (isDirect ? styles.badgeDirect : styles.badgeCyan),
              ]}
            >
              <Ionicons
                name={isThread ? 'chatbubbles' : (isDirect ? 'person' : 'chatbubble-ellipses')}
                size={10}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Text Content */}
          <View style={styles.textWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText} numberOfLines={1}>
                {inAppNotification.title}
              </Text>
              <Text style={styles.subtitleBadge}>{inAppNotification.subtitle}</Text>
            </View>
            <Text style={styles.bodyText} numberOfLines={1}>
              {inAppNotification.body}
            </Text>
          </View>

          {/* Quick Action Button */}
          <TouchableOpacity
            style={styles.openPill}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <Text style={styles.openPillText}>Xem</Text>
            <Ionicons name="arrow-forward" size={12} color="#0B0E14" />
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color={THEME.textDim} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 99999,
  },
  bannerCard: {
    backgroundColor: 'rgba(19, 24, 34, 0.96)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerCardThread: {
    borderColor: 'rgba(139, 92, 246, 0.45)',
    shadowColor: THEME.secondary,
  },
  bannerCardDirect: {
    borderColor: 'rgba(16, 185, 129, 0.45)',
    shadowColor: THEME.success,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  accentBarCyan: {
    backgroundColor: THEME.primary,
  },
  accentBarThread: {
    backgroundColor: THEME.secondary,
  },
  accentBarDirect: {
    backgroundColor: THEME.success,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  typeIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.surface,
  },
  badgeCyan: {
    backgroundColor: THEME.primary,
  },
  badgeThread: {
    backgroundColor: THEME.secondary,
  },
  badgeDirect: {
    backgroundColor: THEME.success,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  subtitleBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.primaryLight,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bodyText: {
    color: THEME.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: THEME.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  openPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B0E14',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 2,
  },
});
