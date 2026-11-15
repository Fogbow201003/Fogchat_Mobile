import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { THEME } from '../../config/theme';
import { SYSTEM_EMOJIS } from '../../constants/emojis';
import { AttachmentPreview } from './AttachmentPreview';
import { BannerBar } from './BannerBar';
import { EmojiSuggestions } from './EmojiSuggestions';
import { MentionSuggestions } from './MentionSuggestions';
import { QuickEmojiTray } from './QuickEmojiTray';

export const ChatInput = React.memo(({
  onSend,
  onTyping,
  onStopTyping,
  customEmojis = [],
  members = [],
  placeholder = 'Nhập tin nhắn...',
  editingMessage = null,
  onCancelEdit = null,
  replyingParent = null,
  onCancelReply = null,
  onAddCustomEmoji = null,
}) => {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Attachment state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Suggestions state
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [showEmojiSuggestions, setShowEmojiSuggestions] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');

  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const typingTimeoutRef = useRef(null);
  const textInputRef = useRef(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
    }
  }, [editingMessage]);

  const handleChangeText = (val) => {
    setText(val);

    if (val.trim().length === 0) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (onStopTyping) onStopTyping();
    } else if (onTyping) {
      onTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) onStopTyping();
      }, 2500);
    }

    const words = val.split(/\s+/);
    const lastWord = words[words.length - 1] || '';

    if (lastWord.startsWith(':') && lastWord.length >= 2) {
      setShowEmojiSuggestions(true);
      setEmojiQuery(lastWord.slice(1).toLowerCase());
      setShowMentionSuggestions(false);
    } else if (lastWord.startsWith('@')) {
      setShowMentionSuggestions(true);
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setShowEmojiSuggestions(false);
    } else {
      setShowEmojiSuggestions(false);
      setShowMentionSuggestions(false);
    }
  };

  const handleSelectEmoji = (emojiCodeOrChar) => {
    const words = text.split(/\s+/);
    words.pop();
    const newText = words.length > 0 ? `${words.join(' ')} ${emojiCodeOrChar} ` : `${emojiCodeOrChar} `;
    setText(newText);
    setShowEmojiSuggestions(false);
  };

  const handleInsertEmojiFromTray = (emojiCharOrCode) => {
    setText((prev) => (prev ? `${prev} ${emojiCharOrCode} ` : `${emojiCharOrCode} `));
  };

  const handleSelectMention = (username) => {
    const words = text.split(/\s+/);
    words.pop();
    const mentionTag = `@${username} `;
    const newText = words.length > 0 ? `${words.join(' ')} ${mentionTag}` : mentionTag;
    setText(newText);
    setShowMentionSuggestions(false);
  };

  const triggerMention = () => {
    setText((prev) => (prev.endsWith(' ') || !prev ? `${prev}@` : `${prev} @`));
    setShowMentionSuggestions(true);
    setMentionQuery('');
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const name = uri.split('/').pop() || 'photo.jpg';
        setPreviewUrl(uri);
        setSelectedFile({
          uri,
          name,
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('ImagePicker error:', err);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isImg = asset.mimeType?.startsWith('image/');
        setPreviewUrl(isImg ? asset.uri : null);
        setSelectedFile({
          uri: asset.uri,
          name: asset.name || 'document',
          type: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch (err) {
      console.warn('DocumentPicker error:', err);
    }
  };

  const handlePickFile = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    Alert.alert('Đính kèm tệp', 'Chọn loại tệp bạn muốn gửi:', [
      { text: 'Ảnh từ thư viện', onPress: pickImage },
      { text: 'Tài liệu / File', onPress: pickDocument },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handleFileChangeWeb = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;

    if (onStopTyping) onStopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    onSend(trimmed, {
      file: selectedFile,
      previewUrl: previewUrl,
      parentId: replyingParent?.id || null,
    });

    setText('');
    removeFile();
    setShowEmojiSuggestions(false);
    setShowMentionSuggestions(false);
    setShowEmojiTray(false);
  };

  const filteredCustomEmojis = useMemo(() => {
    return customEmojis
      .filter(
        (e) =>
          e.shortcode?.toLowerCase().includes(emojiQuery) ||
          (e.name && e.name.toLowerCase().includes(emojiQuery))
      )
      .slice(0, 6);
  }, [customEmojis, emojiQuery]);

  const filteredSystemEmojis = useMemo(() => {
    return SYSTEM_EMOJIS.filter(
      (e) =>
        e.shortcode.toLowerCase().includes(emojiQuery) ||
        e.name.toLowerCase().includes(emojiQuery)
    ).slice(0, 8);
  }, [emojiQuery]);

  const filteredMembers = useMemo(() => {
    if (!mentionQuery) return members.slice(0, 8);
    return members
      .filter(
        (m) =>
          (m.username && m.username.toLowerCase().includes(mentionQuery)) ||
          (m.name && m.name.toLowerCase().includes(mentionQuery))
      )
      .slice(0, 8);
  }, [members, mentionQuery]);

  const canSend = text.trim().length > 0 || selectedFile !== null;

  return (
    <View style={[styles.outerContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,video/mp4,application/pdf"
          onChange={handleFileChangeWeb}
        />
      )}

      {/* Autocomplete Emojis */}
      <EmojiSuggestions
        visible={showEmojiSuggestions}
        customEmojis={filteredCustomEmojis}
        systemEmojis={filteredSystemEmojis}
        onSelectCustom={handleSelectEmoji}
        onSelectSystem={handleSelectEmoji}
      />

      {/* Autocomplete Mentions */}
      <MentionSuggestions
        visible={showMentionSuggestions}
        members={filteredMembers}
        onSelect={handleSelectMention}
      />

      {/* Quick Emoji Tray */}
      <QuickEmojiTray
        visible={showEmojiTray}
        customEmojis={customEmojis}
        onSelectEmoji={handleInsertEmojiFromTray}
        onAddCustomEmoji={() => {
          setShowEmojiTray(false);
          if (onAddCustomEmoji) onAddCustomEmoji();
        }}
        onClose={() => setShowEmojiTray(false)}
      />

      {/* Edit or Reply Banner */}
      <BannerBar
        editingMessage={editingMessage}
        onCancelEdit={onCancelEdit}
        replyingParent={replyingParent}
        onCancelReply={onCancelReply}
      />

      {/* File Preview */}
      <AttachmentPreview
        file={selectedFile}
        previewUrl={previewUrl}
        onRemove={removeFile}
      />

      {/* Input Action Bar */}
      <View style={[styles.inputBar, isFocused && styles.inputBarFocused]}>
        <TouchableOpacity style={styles.actionIconBtn} onPress={handlePickFile} activeOpacity={0.7}>
          <Ionicons name="add-circle" size={24} color={selectedFile ? THEME.primary : THEME.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => setShowEmojiTray(!showEmojiTray)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showEmojiTray ? 'happy' : 'happy-outline'}
            size={22}
            color={showEmojiTray ? THEME.primary : THEME.textDim}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionIconBtn} onPress={triggerMention} activeOpacity={0.7}>
          <Ionicons name="at-circle-outline" size={22} color={THEME.textDim} />
        </TouchableOpacity>

        <TextInput
          ref={textInputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={THEME.textPlaceholder}
          value={text}
          onChangeText={handleChangeText}
          onFocus={() => {
            setIsFocused(true);
            setShowEmojiTray(false);
          }}
          onBlur={() => setIsFocused(false)}
          multiline
          blurOnSubmit={false}
          maxLength={2000}
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        >
          <LinearGradient
            colors={canSend ? THEME.gradientPrimary : ['#222B3D', '#1A212E']}
            style={styles.sendGradient}
          >
            <Ionicons
              name={editingMessage ? 'checkmark' : 'paper-plane'}
              size={17}
              color={canSend ? '#FFFFFF' : THEME.textPlaceholder}
              style={{ marginLeft: editingMessage ? 0 : 2 }}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusFull,
    borderWidth: 1.5,
    borderColor: THEME.borderLight,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
    minHeight: 48,
  },
  inputBarFocused: {
    borderColor: THEME.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
    maxHeight: 100,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
        boxShadow: 'none',
        border: 'none',
      },
    }),
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    flexShrink: 0,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sendGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
