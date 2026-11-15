import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { ChatProvider } from './src/context/ChatContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { InAppNotificationBanner } from './src/components/InAppNotificationBanner';
import { THEME } from './src/config/theme';

export const navigationRef = createNavigationContainerRef();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: THEME.primary,
    background: THEME.background,
    card: THEME.surface,
    text: THEME.text,
    border: THEME.border,
    notification: THEME.secondary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar style="light" backgroundColor={THEME.background} />
      <AuthProvider>
        <ChatProvider>
          <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <RootNavigator />
            <InAppNotificationBanner navigation={navigationRef} />
          </NavigationContainer>
        </ChatProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
