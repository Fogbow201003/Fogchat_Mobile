import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';

export const EmojiSuggestions = ({
  visible,
  customEmojis = [],
  systemEmojis = [],
  onSelectCustom,
  onSelectSystem,
}) => {
  if (!visible || (customEmojis.length === 0 && systemEmojis.length === 0)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={13} color={THEME.primary} />
        <Text style={styles.title}>GỢI Ý BIỂU CẢM EMOJI</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {customEmojis.map((emoji) => (
          <TouchableOpacity
            key={emoji.shortcode}
            style={styles.item}
            onPress={() => onSelectCustom(emoji.shortcode)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: emoji.imageUrl }} style={styles.emojiImg} />
            <Text style={styles.emojiCode} numberOfLines={1}>
              {emoji.shortcode}
            </Text>
          </TouchableOpacity>
        ))}

        {systemEmojis.map((item) => (
          <TouchableOpacity
            key={item.shortcode}
            style={styles.item}
            onPress={() => onSelectSystem(item.char)}
            activeOpacity={0.7}
          >
            <Text style={styles.systemChar}>{item.char}</Text>
            <Text style={styles.emojiCode} numberOfLines={1}>
              {item.shortcode}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    padding: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
    paddingBottom: 4,
    marginBottom: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emojiImg: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  systemChar: {
    fontSize: 16,
  },
  emojiCode: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
  },
});
