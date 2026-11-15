import { Platform } from 'react-native';
import Constants from 'expo-constants';

// FogChat Mobile Theme System - High-End Dark Cyber Aesthetic
export const THEME = {
  // Backgrounds
  background: '#0B0E14',       // Deep obsidian canvas
  surface: '#131822',          // Card/Container surface
  surfaceElevated: '#1A212E',  // Interactive elements, inputs, hover states
  surfaceHighlight: '#222B3D', // Message bubble other, selected item
  
  // Borders & Dividers
  border: '#232C3D',           // Subtle card border
  borderLight: '#323E56',      // Focused border
  divider: '#18202C',
  
  // Brand & Accents
  primary: '#06B6D4',          // Vibrant Cyan
  primaryDark: '#0891B2',      // Deep Cyan
  primaryLight: '#67E8F9',     // Cyan highlight
  primaryGlow: 'rgba(6, 182, 212, 0.22)',
  
  secondary: '#8B5CF6',        // Electric Violet
  secondaryLight: '#A78BFA',
  secondaryGlow: 'rgba(139, 92, 246, 0.22)',
  
  accent: '#3B82F6',           // Tech Blue
  
  // Status Colors
  success: '#10B981',          // Online emerald
  warning: '#F59E0B',          // Away / Warning amber
  danger: '#EF4444',           // Offline / Delete rose red
  info: '#38BDF8',
  
  // Typography Colors
  text: '#F8FAFC',             // Slate 50 - Ultra high contrast
  textSecondary: '#CBD5E1',    // Slate 300
  textMuted: '#94A3B8',        // Slate 400
  textDim: '#64748B',          // Slate 500
  textPlaceholder: '#475569',  // Slate 600
  
  // Chat Bubble Specific
  myBubbleBg: '#0E7490',       // Cyan 700 gradient base
  myBubbleBorder: '#06B6D4',
  otherBubbleBg: '#161D2A',    // Elevated slate
  otherBubbleBorder: '#232D3F',
  
  // Gradients for Expo LinearGradient
  gradientPrimary: ['#06B6D4', '#3B82F6'],
  gradientViolet: ['#8B5CF6', '#6366F1'],
  gradientDark: ['#131822', '#0B0E14'],
  gradientHeader: ['rgba(19, 24, 34, 0.98)', 'rgba(11, 14, 20, 0.95)'],
  
  // Radii
  radiusSm: 8,
  radiusMd: 14,
  radiusLg: 20,
  radiusFull: 9999,
};

const getServerUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (Platform.OS === 'web') return 'http://localhost:5000';
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000`;
      }
    }
  } catch (e) {
    // ignore
  }
  return 'http://192.168.0.109:5000';
};

export const DEFAULT_SERVER_URL = getServerUrl();
