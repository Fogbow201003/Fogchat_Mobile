import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../config/theme';

const STATUS_DOT_COLORS = {
  ONLINE: '#10B981',
  AWAY: '#F59E0B',
  DND: '#EF4444',
  OFFLINE: '#64748B',
};

export const Avatar = ({
  uri,
  name = 'User',
  size = 40,
  isOnline = false,
  status,
  showStatus = true,
  style,
}) => {
  const firstLetter = (name || 'U').charAt(0).toUpperCase();

  // Pick deterministic gradient colors based on name
  const getGradient = (str) => {
    const charCode = str.charCodeAt(0) || 0;
    if (charCode % 3 === 0) return THEME.gradientPrimary;
    if (charCode % 3 === 1) return THEME.gradientViolet;
    return ['#059669', '#10B981']; // Emerald gradient
  };

  const statusSize = Math.max(10, Math.floor(size * 0.28));
  const safeUri = uri ? (uri.startsWith('http://res.cloudinary.com') ? uri.replace('http://', 'https://') : uri) : null;

  return (
    <View style={[{ width: size, height: size, position: 'relative' }, style, { borderRadius: size / 2 }]}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        {safeUri ? (
          <Image
            source={{ uri: safeUri }}
            style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          />
        ) : (
          <LinearGradient
            colors={getGradient(name)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}
          >
            <Text style={[styles.letter, { fontSize: Math.floor(size * 0.42) }]}>
              {firstLetter}
            </Text>
          </LinearGradient>
        )}
      </View>

      {showStatus && (isOnline || status) && (
        <View
          style={[
            styles.statusDot,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              bottom: 0,
              right: 0,
              backgroundColor: status
                ? (STATUS_DOT_COLORS[status] || THEME.success)
                : THEME.success,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1.5,
    borderColor: THEME.border,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statusDot: {
    position: 'absolute',
    backgroundColor: THEME.success,
    borderWidth: 2,
    borderColor: THEME.background,
    shadowColor: THEME.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});
