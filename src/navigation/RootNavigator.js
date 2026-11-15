import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../config/theme';
import { useAuth } from '../context/AuthContext';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { MainTabs } from './MainTabs';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { ThreadScreen } from '../screens/chat/ThreadScreen';
import { ChannelDetailsScreen } from '../screens/chat/ChannelDetailsScreen';
import { SavedMessagesScreen } from '../screens/main/SavedMessagesScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Splash Loading Screen
  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <LinearGradient colors={THEME.gradientPrimary} style={styles.splashLogo}>
          <Ionicons name="chatbubbles" size={42} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.splashTitle}>FogChat Mobile</Text>
        <ActivityIndicator size="small" color={THEME.primary} style={styles.spinner} />
        <Text style={styles.splashSub}>Đang đồng bộ phiên làm việc...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: THEME.background },
        animation: 'slide_from_right',
      }}
    >
      {isAuthenticated ? (
        // Authenticated App Stack
        <Stack.Group
          screenOptions={{
            contentStyle: { backgroundColor: THEME.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          <Stack.Screen name="Thread" component={ThreadScreen} />
          <Stack.Screen name="ChannelDetails" component={ChannelDetailsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="SavedMessages" component={SavedMessagesScreen} />
        </Stack.Group>
      ) : (
        // Auth Stack
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  splashTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.text,
    letterSpacing: 0.8,
  },
  spinner: {
    marginTop: 20,
    marginBottom: 10,
  },
  splashSub: {
    fontSize: 12,
    color: THEME.textDim,
  },
});
