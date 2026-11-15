import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../config/theme';
import { Avatar } from '../../components/Avatar';
import { messageApi } from '../../services/api';
import { formatRelativeTime } from '../../utils/date';

export const SearchMessagesModal = ({
  visible,
  onClose,
  workspaceId,
  workspaceName,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || !workspaceId) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await messageApi.searchMessages({
        q: trimmed,
        workspaceId,
      });
      const list = res.data || res.messages || res || [];
      setResults(list);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickFilter = (prefix) => {
    setQuery(prev => `${prev ? prev + ' ' : ''}${prefix}`);
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleWrap}>
                  <Text style={styles.title}>TÌM KIẾM TIN NHẮN</Text>
                  <Text style={styles.subtitle}>
                    Không gian: {workspaceName || 'Workspace'}
                  </Text>
                </View>

                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={THEME.textDim} />
                </TouchableOpacity>
              </View>

              {/* Search Input Bar */}
              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={20} color={THEME.primary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Nhập từ khóa cần tìm..."
                  placeholderTextColor={THEME.textPlaceholder}
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  autoFocus
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color={THEME.textDim} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.searchBtn, (!query.trim() || isSearching) && styles.searchBtnDisabled]}
                  onPress={handleSearch}
                  disabled={!query.trim() || isSearching}
                >
                  <Text style={styles.searchBtnText}>Tìm</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Syntax Filter Chips */}
              <View style={styles.filtersRow}>
                <Text style={styles.filterLabel}>GỢI Ý:</Text>
                <TouchableOpacity
                  style={styles.filterChip}
                  onPress={() => handleQuickFilter('has:link')}
                >
                  <Text style={styles.filterChipText}>has:link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterChip}
                  onPress={() => handleQuickFilter('has:file')}
                >
                  <Text style={styles.filterChipText}>has:file</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterChip}
                  onPress={() => handleQuickFilter('from:')}
                >
                  <Text style={styles.filterChipText}>from:user</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterChip}
                  onPress={() => handleQuickFilter('in:')}
                >
                  <Text style={styles.filterChipText}>in:kênh</Text>
                </TouchableOpacity>
              </View>

              {/* Results */}
              {isSearching ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color={THEME.primary} />
                  <Text style={styles.loadingText}>Đang quét cơ sở dữ liệu tin nhắn...</Text>
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    hasSearched ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="search" size={36} color={THEME.textDim} style={{ marginBottom: 8 }} />
                        <Text style={styles.emptyTitle}>Không tìm thấy kết quả nào</Text>
                        <Text style={styles.emptyDesc}>
                          Thử tìm kiếm với từ khóa khác hoặc cú pháp ngắn gọn hơn.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="chatbox-ellipses-outline" size={36} color={THEME.textDim} style={{ marginBottom: 8 }} />
                        <Text style={styles.emptyTitle}>Tìm kiếm toàn diện</Text>
                        <Text style={styles.emptyDesc}>
                          Nhập từ khóa và nhấn nút "Tìm" để tra cứu tin nhắn trên tất cả các kênh bạn tham gia.
                        </Text>
                      </View>
                    )
                  }
                  renderItem={({ item }) => {
                    const user = item.user || {};
                    const channel = item.channel || {};
                    return (
                      <TouchableOpacity
                        style={styles.resultCard}
                        onPress={() => {
                          handleClose();
                          if (onSelectResult) onSelectResult(item);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.cardTop}>
                          <View style={styles.channelBadge}>
                            <Text style={styles.channelHash}>#</Text>
                            <Text style={styles.channelName}>{channel.name || 'kênh'}</Text>
                          </View>
                          <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                        </View>

                        <View style={styles.cardBody}>
                          <Avatar
                            uri={user.avatarUrl}
                            name={user.name || user.username}
                            size={28}
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.userName}>{user.name || user.username || 'Thành viên'}</Text>
                            <Text style={styles.contentSnippet} numberOfLines={2}>
                              {item.content || (item.fileUrl ? '[Tệp đính kèm]' : '')}
                            </Text>
                          </View>
                        </View>

                        {!!item.fileUrl && (
                          <Image source={{ uri: item.fileUrl }} style={styles.thumbnail} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingTop: 12,
    height: '85%',
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.borderLight,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: THEME.text,
    fontSize: 14,
  },
  clearBtn: {
    padding: 6,
  },
  searchBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 6,
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },
  searchBtnText: {
    color: '#0B0E14',
    fontSize: 13,
    fontWeight: '700',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textDim,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  filterChipText: {
    fontSize: 11,
    color: THEME.primary,
    fontFamily: 'monospace',
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textSecondary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: THEME.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: THEME.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  channelHash: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
    marginRight: 2,
  },
  channelName: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  timeText: {
    fontSize: 10,
    color: THEME.textDim,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primaryLight,
    marginBottom: 2,
  },
  contentSnippet: {
    fontSize: 13,
    color: THEME.text,
    lineHeight: 18,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
    resizeMode: 'cover',
  },
});
