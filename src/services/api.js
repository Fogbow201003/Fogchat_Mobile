import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from './storage';
import { DEFAULT_SERVER_URL } from '../config/theme';

// Default host: sync with DEFAULT_SERVER_URL
const defaultHost = DEFAULT_SERVER_URL;
export const API_BASE_URL = `${defaultHost}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const updateApiBaseUrl = (newUrl) => {
  const cleanUrl = newUrl.replace(/\/+$/, '');
  apiClient.defaults.baseURL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export const getApiBaseUrl = () => apiClient.defaults.baseURL || API_BASE_URL;

let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

// Request Interceptor: Attach JWT Bearer Token automatically
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // For FormData uploads, let the runtime automatically configure multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for handling common errors and expired tokens
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const isAuthRoute =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register');

    const errMsg = error.response?.data?.message || '';
    const isTokenExpired =
      status === 401 ||
      (status === 403 && errMsg.toLowerCase().includes('token'));

    if (isTokenExpired && !isAuthRoute) {
      const currentToken = await storage.getToken();
      const failedAuthHeader = error.config?.headers?.Authorization || '';
      const failedToken = failedAuthHeader.replace(/^Bearer\s+/i, '');
      if (currentToken && failedToken === currentToken && onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    const message = error.response?.data?.message || error.message || 'Lỗi kết nối máy chủ';
    const customErr = new Error(message);
    customErr.status = status;
    return Promise.reject(customErr);
  }
);

// 1. Auth Endpoints
export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  register: (data) => apiClient.post('/auth/register', data),
  getMe: () => apiClient.get('/auth/me'),
  changePassword: (data) => apiClient.put('/auth/change-password', data),
};

// 2. User & Profile Endpoints
export const userApi = {
  updateProfile: (data) => apiClient.put('/users/profile', data),
  updateStatus: (data) => apiClient.put('/users/status', data),
};

// 3. Workspace Endpoints
export const workspaceApi = {
  getWorkspaces: () => apiClient.get('/workspaces'),
  createWorkspace: (data) => apiClient.post('/workspaces', data),
  joinWorkspace: (data) => apiClient.post('/workspaces/join', data),
  getWorkspaceMembers: (workspaceId) => apiClient.get(`/workspaces/${workspaceId}/members`),
  getAvailableUsers: (workspaceId) => apiClient.get(`/workspaces/${workspaceId}/available-users`),
  addMembers: (workspaceId, userIds, role = 'MEMBER') => apiClient.post(`/workspaces/${workspaceId}/members`, { userIds, role }),
  updateMemberRole: (workspaceId, targetUserId, role) => apiClient.patch(`/workspaces/${workspaceId}/members/${targetUserId}/role`, { role }),
  removeMember: (workspaceId, targetUserId) => apiClient.delete(`/workspaces/${workspaceId}/members/${targetUserId}`),
  provisionUser: (workspaceId, data) => apiClient.post(`/workspaces/${workspaceId}/provision-user`, data),
  toggleMemberStatus: (workspaceId, targetUserId, isActive) => apiClient.patch(`/workspaces/${workspaceId}/members/${targetUserId}/status`, { isActive }),
  regenerateInviteCode: (workspaceId) => apiClient.patch(`/workspaces/${workspaceId}/invite-code`),
  deleteWorkspace: (workspaceId) => apiClient.delete(`/workspaces/${workspaceId}`),
};

// 4. Channel Endpoints
export const channelApi = {
  getChannels: (workspaceId) => apiClient.get(`/channels/workspace/${workspaceId}`),
  createChannel: (data) => apiClient.post('/channels', data),
  updateChannel: (channelId, data) => apiClient.put(`/channels/${channelId}`, data),
  deleteChannel: (channelId) => apiClient.delete(`/channels/${channelId}`),
  inviteMembers: (channelId, userIds) => apiClient.post(`/channels/${channelId}/invite`, { userIds }),
  removeMember: (channelId, userId) => apiClient.delete(`/channels/${channelId}/members/${userId}`),
  updateMemberRole: (channelId, userId, role) => apiClient.patch(`/channels/${channelId}/members/${userId}/role`, { role }),
  getOrCreateDirectChannel: (data) => apiClient.post('/channels/direct', data),
  getMessages: (channelId, params = {}) => apiClient.get(`/channels/${channelId}/messages`, { params }),
  getMembers: (channelId) => apiClient.get(`/channels/${channelId}/members`),
};

// 5. Message Endpoints (CRUD, Pin, Bookmark, Read Receipts, Search)
export const messageApi = {
  editMessage: (messageId, content) => apiClient.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => apiClient.delete(`/messages/${messageId}`),
  getThreadReplies: (messageId) => apiClient.get(`/messages/${messageId}/thread`),
  togglePin: (messageId) => apiClient.post(`/messages/${messageId}/pin`),
  toggleSave: (messageId) => apiClient.post(`/messages/${messageId}/save`),
  getSavedMessages: () => apiClient.get('/messages/saved'),
  searchMessages: (params) => apiClient.get('/messages/search', { params }),
  markAsRead: (channelId, messageId) => apiClient.post(`/messages/${channelId}/read`, { messageId }),
};

// 6. Custom Emoji Endpoints
export const emojiApi = {
  getEmojis: (workspaceId) => apiClient.get(`/emojis/workspace/${workspaceId}`),
  uploadCustomEmoji: (formData) => apiClient.post('/emojis', formData, {
    headers: { 'Content-Type': undefined },
  }),
  deleteCustomEmoji: (emojiId) => apiClient.delete(`/emojis/${emojiId}`),
};

// 7. File Upload Endpoint (Cloudinary)
export const uploadApi = {
  uploadFile: (formData) => apiClient.post('/upload', formData, {
    headers: { 'Content-Type': undefined },
  }),
};
