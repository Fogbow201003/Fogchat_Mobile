import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../config/theme';
import { useChat } from '../context/ChatContext';
import { ChannelListScreen } from '../screens/main/ChannelListScreen';
import { DirectMessagesScreen } from '../screens/main/DirectMessagesScreen';
import { SavedMessagesScreen } from '../screens/main/SavedMessagesScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

export const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);
  const tabHeight = 68 + bottomPadding;
  const { unreadChannelTotal, unreadDirectTotal } = useChat();

  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: THEME.background }}
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabHeight,
            paddingBottom: bottomPadding,
          },
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.textDim,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="ChannelsTab"
        component={ChannelListScreen}
        options={{
          tabBarLabel: 'Kênh',
          tabBarBadge: unreadChannelTotal > 0 ? (unreadChannelTotal > 99 ? '99+' : unreadChannelTotal) : undefined,
          tabBarBadgeStyle: styles.badgeCyan,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="DirectMessagesTab"
        component={DirectMessagesScreen}
        options={{
          tabBarLabel: 'Nhắn riêng',
          tabBarBadge: unreadDirectTotal > 0 ? (unreadDirectTotal > 99 ? '99+' : unreadDirectTotal) : undefined,
          tabBarBadgeStyle: styles.badgeGreen,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="SavedMessagesTab"
        component={SavedMessagesScreen}
        options={{
          tabBarLabel: 'Đã lưu',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    overflow: 'visible',
  },
  tabBarItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
    overflow: 'visible',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 0,
    letterSpacing: 0.2,
    includeFontPadding: false,
    overflow: 'visible',
  },
  badgeCyan: {
    backgroundColor: THEME.primary,
    color: '#0B0E14',
    fontSize: 10,
    fontWeight: '900',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    lineHeight: 16,
  },
  badgeGreen: {
    backgroundColor: THEME.success,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    lineHeight: 16,
  },
});
