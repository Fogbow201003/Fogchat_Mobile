import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';

export const MentionSuggestions = ({ visible, members = [], onSelect }) => {
  if (!visible || members.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="at" size={13} color={THEME.primary} />
        <Text style={styles.title}>THÀNH VIÊN TRONG KHÔNG GIAN ({members.length})</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {members.map((member) => (
          <TouchableOpacity
            key={member.id}
            style={styles.item}
            onPress={() => onSelect(member.username)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(member.name || member.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.username} numberOfLines={1}>
                @{member.username}
              </Text>
              {member.name && member.name !== member.username && (
                <Text style={styles.displayName} numberOfLines={1}>
                  {member.name}
                </Text>
              )}
            </View>
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
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0B0E14',
    fontSize: 11,
    fontWeight: '800',
  },
  username: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
  },
  displayName: {
    fontSize: 10,
    color: THEME.textDim,
  },
});
