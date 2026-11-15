import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Alert } from 'react-native';
import { storage } from '../services/storage';
import { authApi, updateApiBaseUrl, setOnUnauthorizedCallback } from '../services/api';
import { socketService } from '../services/socket';
import { DEFAULT_SERVER_URL } from '../config/theme';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [isLoading, setIsLoading] = useState(true);

  const isLoggingOutRef = useRef(false);

  const logout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      socketService.disconnect();
      await storage.clearAuth();
      setToken(null);
      setUser(null);
    } finally {
      isLoggingOutRef.current = false;
    }
  }, []);

  // Listen to 401/403 responses globally from api client
  useEffect(() => {
    setOnUnauthorizedCallback(async () => {
      console.warn('Phiên đăng nhập hết hạn hoặc bị từ chối. Đang đăng xuất tự động...');
      await logout();
    });
  }, [logout]);

  // Initialize auth state from storage on app launch
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedUrl = await storage.getServerUrl();
        // If storedUrl points to stale subnet 192.168.1.6, auto migrate to DEFAULT_SERVER_URL
        if (storedUrl && !storedUrl.includes('192.168.1.6')) {
          setServerUrl(storedUrl);
          updateApiBaseUrl(storedUrl);
        } else {
          setServerUrl(DEFAULT_SERVER_URL);
          updateApiBaseUrl(DEFAULT_SERVER_URL);
          if (storedUrl && storedUrl.includes('192.168.1.6')) {
            await storage.setServerUrl(DEFAULT_SERVER_URL);
          }
        }

        const storedToken = await storage.getToken();
        const storedUser = await storage.getUser();

        if (storedToken && storedUser) {
          try {
            // Xác thực token với server ngay trong lúc Splash đang hiển thị
            // để tránh nháy màn hình Đăng nhập hoặc vào nhầm màn hình chính rồi bị đá ra
            const res = await authApi.getMe();
            const freshUser = res?.user || storedUser;
            setToken(storedToken);
            setUser(freshUser);
            await storage.setUser(freshUser);
            socketService.connect(storedToken);
          } catch (verifyErr) {
            if (verifyErr?.status === 401 || verifyErr?.status === 403) {
              // Token hết hạn hoặc tài khoản bị khóa -> xóa sạch trước khi tắt Splash
              await storage.clearAuth();
            } else {
              // Lỗi mạng tạm thời -> vẫn giữ phiên cục bộ để không đăng xuất oan
              setToken(storedToken);
              setUser(storedUser);
              socketService.connect(storedToken);
            }
          }
        }
      } catch (e) {
        console.error('AuthContext bootstrap error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [logout]);

  // Reconnect socket cleanly when app returns from background to foreground
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        token
      ) {
        if (!socketService.socket?.connected) {
          socketService.connect(token);
        }
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription?.remove();
  }, [token]);

  // Listen to force_logout event from Admin Kill-Switch
  useEffect(() => {
    if (!token) return;
    const handleForceLogout = async (data) => {
      Alert.alert(
        'Phiên làm việc bị chấm dứt',
        data?.reason || 'Tài khoản của bạn đã bị Quản trị viên vô hiệu hóa!'
      );
      await logout();
    };
    socketService.on('force_logout', handleForceLogout);
    return () => socketService.off('force_logout', handleForceLogout);
  }, [token, logout]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    // Expected response format from backend: { token, user: { id, email, username, name, avatarUrl } }
    const authToken = res.token;
    const userData = res.user;

    setToken(authToken);
    setUser(userData);

    await storage.setToken(authToken);
    await storage.setUser(userData);

    // Connect socket with new token
    await socketService.connect(authToken);
    return userData;
  };

  const register = async (userData) => {
    // userData: { username, email, password, name }
    const res = await authApi.register(userData);
    const authToken = res.token;
    const userProfile = res.user;

    setToken(authToken);
    setUser(userProfile);

    await storage.setToken(authToken);
    await storage.setUser(userProfile);

    await socketService.connect(authToken);
    return userProfile;
  };

  const updateUserData = async (newUserData) => {
    const updated = { ...user, ...newUserData };
    setUser(updated);
    await storage.setUser(updated);
  };

  const updateServer = async (newUrl) => {
    const cleanUrl = newUrl.trim().replace(/\/+$/, '');
    await storage.setServerUrl(cleanUrl);
    setServerUrl(cleanUrl);
    updateApiBaseUrl(cleanUrl);

    // Reconnect socket if logged in
    if (token) {
      socketService.disconnect();
      socketService.connect(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        serverUrl,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        updateUserData,
        updateServer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
