import { io } from 'socket.io-client';
import { storage } from './storage';
import { DEFAULT_SERVER_URL } from '../config/theme';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.joinedChannels = new Set();
  }

  async connect(token) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const serverUrl = await storage.getServerUrl() || DEFAULT_SERVER_URL;
    const userToken = token || (await storage.getToken());

    if (!userToken) {
      console.warn('Socket connect: Không có token xác thực');
      return null;
    }

    this.socket = io(serverUrl, {
      auth: { token: userToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.joinedChannels.forEach((cid) => {
        this.socket.emit('join_channel', cid);
      });
      if (this.currentChannelId && !this.joinedChannels.has(this.currentChannelId)) {
        this.socket.emit('join_channel', this.currentChannelId);
      }
      this.socket.emit('get_online_users');
    });

    // Attach all queued/registered listeners to the newly created socket instance
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.socket.on(event, cb);
      });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
      if (err.message && (err.message.includes('Authentication') || err.message.includes('Invalid Token'))) {
        // Stop retrying with an invalid/expired token
        this.disconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChannel(channelId) {
    if (channelId) {
      this.currentChannelId = channelId;
      this.joinedChannels.add(channelId);
      if (this.socket && this.socket.connected) {
        this.socket.emit('join_channel', channelId);
      } else if (this.socket) {
        this.socket.emit('join_channel', channelId);
      }
    }
  }

  sendMessage(messageData) {
    // messageData: { channelId, content, fileUrl, parentId }
    if (this.socket) {
      this.socket.emit('send_message', messageData);
    }
  }

  sendTyping(channelId, username, parentId = null) {
    if (this.socket) {
      this.socket.emit('typing', { channelId, username, parentId });
    }
  }

  sendStopTyping(channelId, username, parentId = null) {
    if (this.socket) {
      this.socket.emit('stop_typing', { channelId, username, parentId });
    }
  }

  toggleReaction(messageId, emoji, channelId) {
    if (this.socket) {
      this.socket.emit('toggle_reaction', { messageId, emoji, channelId });
    }
  }

  deleteMessage(messageId, channelId) {
    if (this.socket) {
      this.socket.emit('delete_message', { messageId, channelId });
    }
  }

  editMessage(messageId, content, channelId) {
    if (this.socket) {
      this.socket.emit('edit_message', { messageId, content, channelId });
    }
  }

  // Subscribe to real-time events (safe even if socket is still connecting)
  on(event, callback) {
    if (!event || !callback) return;
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event);
    if (!set.has(callback)) {
      set.add(callback);
      if (this.socket) {
        this.socket.on(event, callback);
      }
    }
  }

  off(event, callback) {
    if (!event) return;
    if (callback) {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(event);
      }
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }
}

export const socketService = new SocketService();
