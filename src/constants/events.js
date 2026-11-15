export const SOCKET_EVENTS = {
  // Client emits
  JOIN_CHANNEL: 'join_channel',
  SEND_MESSAGE: 'send_message',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  TOGGLE_REACTION: 'toggle_reaction',
  EDIT_MESSAGE: 'edit_message',
  DELETE_MESSAGE: 'delete_message',

  // Server broadcasts
  RECEIVE_MESSAGE: 'receive_message',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  UPDATE_REACTION: 'update_reaction',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_DELETED: 'message_deleted',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  ONLINE_USERS_LIST: 'online_users_list',
  MESSAGES_READ: 'messages_read',
  MESSAGE_PINNED_TOGGLED: 'message_pinned_toggled',
  CHANNEL_DELETED: 'channel_deleted',
  NEW_CHANNEL_CREATED: 'new_channel_created',
};
