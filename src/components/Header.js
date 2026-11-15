import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../config/theme';

export const Header = ({
  title,
  subtitle,
  icon = 'chatbubble-ellipses-outline',
  onBack,
  onTitlePress,
  rightActions,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: insets.top > 0 ? insets.top : 8,
          height: 56 + (insets.top > 0 ? insets.top : 0),
        },
        style,
      ]}
    >
      {/* Left icon / Back button */}
      {onBack ? (
        <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={THEME.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.leadIconWrap}>
          <Ionicons name={icon} size={20} color={THEME.primary} />
        </View>
      )}

      {/* Center Title & Subtitle */}
      <TouchableOpacity
        style={styles.centerWrap}
        onPress={onTitlePress}
        disabled={!onTitlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </TouchableOpacity>

      {/* Right custom actions */}
      <View style={styles.rightWrap}>
        {rightActions}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.textDim,
    marginTop: 1,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
