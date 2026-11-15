import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { DEFAULT_SERVER_URL } from '../config/theme';

const KEYS = {
  TOKEN: 'fogchat_token',
  USER: 'fogchat_user',
  SERVER_URL: 'fogchat_server_url',
  ACTIVE_WORKSPACE_ID: 'fogchat_active_workspace_id',
};

// High-speed memory fallback cache ensuring instant availability and zero crash
const memoryCache = new Map();

// Helper to check if running strictly in a Web browser environment
const isWeb = Platform.OS === 'web';

const getWebStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (e) {
    // LocalStorage blocked (e.g. private browsing)
  }
  return null;
};

const safeSet = async (key, value) => {
  if (!key || value === undefined || value === null) return;
  const strVal = typeof value === 'string' ? value : JSON.stringify(value);
  memoryCache.set(key, strVal);

  if (isWeb) {
    const ls = getWebStorage();
    if (ls) {
      try {
        ls.setItem(key, strVal);
      } catch (e) {
        console.warn(`[Storage] localStorage.setItem failed:`, e);
      }
    }
    return;
  }

  try {
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(key, strVal);
    }
  } catch (e) {
    console.warn(`[Storage] AsyncStorage.setItem fallback to memory:`, e?.message || e);
  }
};

const safeGet = async (key) => {
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  if (isWeb) {
    const ls = getWebStorage();
    if (ls) {
      try {
        const val = ls.getItem(key);
        if (val !== null) {
          memoryCache.set(key, val);
          return val;
        }
      } catch (e) {
        console.warn(`[Storage] localStorage.getItem failed:`, e);
      }
    }
    return null;
  }

  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) {
        memoryCache.set(key, val);
        return val;
      }
    }
  } catch (e) {
    console.warn(`[Storage] AsyncStorage.getItem fallback to memory:`, e?.message || e);
  }
  return null;
};

const safeRemove = async (key) => {
  memoryCache.delete(key);

  if (isWeb) {
    const ls = getWebStorage();
    if (ls) {
      try {
        ls.removeItem(key);
      } catch (e) {
        console.warn(`[Storage] localStorage.removeItem failed:`, e);
      }
    }
    return;
  }

  try {
    if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
      await AsyncStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`[Storage] AsyncStorage.removeItem fallback to memory:`, e?.message || e);
  }
};

export const storage = {
  // Token
  async setToken(token) {
    if (!token) return;
    await safeSet(KEYS.TOKEN, token);
  },
  async getToken() {
    return await safeGet(KEYS.TOKEN);
  },
  async removeToken() {
    await safeRemove(KEYS.TOKEN);
  },

  // User info
  async setUser(user) {
    if (!user) return;
    await safeSet(KEYS.USER, JSON.stringify(user));
  },
  async getUser() {
    const data = await safeGet(KEYS.USER);
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  async removeUser() {
    await safeRemove(KEYS.USER);
  },

  // Server URL
  async setServerUrl(url) {
    if (!url) return;
    await safeSet(KEYS.SERVER_URL, url);
  },
  async getServerUrl() {
    const url = await safeGet(KEYS.SERVER_URL);
    return url || DEFAULT_SERVER_URL;
  },

  // Active Workspace
  async setActiveWorkspaceId(id) {
    if (!id) return;
    await safeSet(KEYS.ACTIVE_WORKSPACE_ID, id);
  },
  async getActiveWorkspaceId() {
    return await safeGet(KEYS.ACTIVE_WORKSPACE_ID);
  },

  // Clear all for logout
  async clearAuth() {
    memoryCache.delete(KEYS.TOKEN);
    memoryCache.delete(KEYS.USER);
    await Promise.all([
      safeRemove(KEYS.TOKEN),
      safeRemove(KEYS.USER),
    ]);
  },
};
export default storage;
