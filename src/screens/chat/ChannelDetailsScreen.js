import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { THEME } from '../../config/theme';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Avatar';
import { Header } from '../../components/Header';
import { channelApi, API_BASE_URL, getApiBaseUrl } from '../../services/api';
import { formatMessageTime } from '../../utils/date';
import { MediaViewerModal } from '../../components/modals/MediaViewerModal';
import { UploadCustomEmojiModal } from '../modals/UploadCustomEmojiModal';

const isImageFile = (url = '') => {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  const docExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.zip', '.rar', '.7z', '.csv', '.json', '.xml',
    '.mp3', '.mp4', '.wav', '.mov'
  ];
  if (docExtensions.some((ext) => clean.endsWith(ext))) {
    return false;
  }
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.heic'];
  if (imageExtensions.some((ext) => clean.endsWith(ext))) {
    return true;
  }
  if (clean.includes('/image/upload/') && !clean.includes('/raw/upload/')) {
    return true;
  }
  return false;
};

const getFileDetails = (url = '') => {
  if (!url) return { name: 'Tài liệu đính kèm', ext: 'FILE', type: 'doc' };
  const clean = url.split('?')[0];
  const raw = clean.split('/').pop() || 'Tài liệu đính kèm';
  const name = decodeURIComponent(raw);
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
  let type = 'doc';
  if (ext === 'PDF') type = 'pdf';
  else if (['DOC', 'DOCX'].includes(ext)) type = 'word';
  else if (['XLS', 'XLSX', 'CSV'].includes(ext)) type = 'excel';
  else if (['ZIP', 'RAR', '7Z', 'TAR'].includes(ext)) type = 'archive';
  return { name, ext, type };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 40) / 3;

export const ChannelDetailsScreen = ({ route, navigation }) => {
  const { channelId, channelName: initChannelName, channelType: initChannelType = 'PUBLIC' } = route.params || {};
  const { user } = useAuth();
  const {
    activeWorkspace,
    workspaceMembers,
    messages,
    channels,
    setActiveChannel,
    updateChannel,
    deleteChannel,
    onlineUsers,
    isWorkspaceAdmin,
    customEmojis = [],
  } = useChat();

  const [channelData, setChannelData] = useState({
    name: initChannelName,
    type: initChannelType,
    createdById: null,
  });

  const [channelMembers, setChannelMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [showUploadEmojiModal, setShowUploadEmojiModal] = useState(false);

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'media'
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUserToInvite, setSelectedUserToInvite] = useState(null);
  const [selectedMemberToManage, setSelectedMemberToManage] = useState(null);

  // Edit Channel Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(initChannelName || '');
  const [editType, setEditType] = useState(initChannelType || 'PUBLIC');
  const [isUpdatingChannel, setIsUpdatingChannel] = useState(false);

  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewerImage, setViewerImage] = useState(null);

  // Fetch actual channel details & members
  const fetchChannelData = useCallback(async () => {
    if (!channelId) return;
    setIsLoadingMembers(true);
    try {
      const res = await channelApi.getMembers(channelId);
      const members = res.data || [];
      const info = res.channel || {};
      const effectiveType = info.type || channelData.type;
      const effectiveName = info.name || channelData.name;
      if (members.length === 0 && effectiveType === 'PUBLIC' && workspaceMembers.length > 0) {
        setChannelMembers(workspaceMembers);
      } else {
        setChannelMembers(members);
      }
      setChannelData(prev => ({
        ...prev,
        name: info.name || prev.name,
        type: info.type || prev.type,
        createdById: info.createdById,
      }));
      setEditName(effectiveName);
      setEditType(effectiveType);
    } catch (err) {
      console.warn('fetchChannelData error:', err);
      // Fallback: If public and no specific members returned, show workspace members
      if (channelData.type === 'PUBLIC') {
        setChannelMembers(workspaceMembers);
      }
    } finally {
      setIsLoadingMembers(false);
    }
  }, [channelId, workspaceMembers, channelData.type]);

  useEffect(() => {
    fetchChannelData();
  }, [fetchChannelData]);

  // Determine current user's role in this channel
  const myChannelMembership = channelMembers.find(m => m.id === user?.id);
  const isChannelCreator = channelData.createdById === user?.id;
  const isChannelAdmin = isChannelCreator || myChannelMembership?.role === 'ADMIN' || isWorkspaceAdmin;

  // Filter and separate channel files into Images and Documents
  const { channelImages, channelDocs } = useMemo(() => {
    const images = [];
    const docs = [];
    messages.forEach((m) => {
      if (m.channelId === channelId && m.fileUrl) {
        if (isImageFile(m.fileUrl)) {
          images.push(m);
        } else {
          docs.push(m);
        }
      }
    });
    return { channelImages: images, channelDocs: docs };
  }, [messages, channelId]);

  const totalFilesCount = channelImages.length + channelDocs.length;

  const handleOpenDoc = (url) => {
    if (!url) return;
    let targetUrl = url.startsWith('http://res.cloudinary.com')
      ? url.replace('http://', 'https://')
      : url;

    const isCloudinaryDoc = targetUrl.includes('res.cloudinary.com') &&
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|txt|csv)(\?|$)/i.test(targetUrl);

    const baseUrl = getApiBaseUrl();
    const downloadUrl = isCloudinaryDoc
      ? `${baseUrl}/upload/download?url=${encodeURIComponent(targetUrl)}`
      : targetUrl;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(downloadUrl, '_blank');
      }
    } else {
      Linking.openURL(downloadUrl).catch(() => {
        Linking.openURL(targetUrl).catch((err) => {
          Alert.alert('Không thể mở file', 'Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.');
        });
      });
    }
  };

  // Save Channel Edit
  const handleSaveChannelEdit = async () => {
    const trimmed = editName.trim().replace(/^#/, '');
    if (!trimmed) {
      Alert.alert('Lỗi', 'Tên kênh không được để trống');
      return;
    }
    setIsUpdatingChannel(true);
    try {
      const updated = await updateChannel(channelId, {
        name: trimmed,
        type: editType,
      });
      setChannelData(prev => ({ ...prev, name: updated.name, type: updated.type }));
      setShowEditModal(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin kênh!');
      fetchChannelData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật kênh');
    } finally {
      setIsUpdatingChannel(false);
    }
  };

  // Invite member into this channel
  const handleInvite = async () => {
    if (!selectedUserToInvite) return;
    setIsInviting(true);
    try {
      await channelApi.inviteMembers(channelId, [selectedUserToInvite.id]);
      Alert.alert('Thành công', `Đã thêm ${selectedUserToInvite.name || selectedUserToInvite.username} vào kênh!`);
      setShowInviteModal(false);
      setSelectedUserToInvite(null);
      fetchChannelData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể mời thành viên');
    } finally {
      setIsInviting(false);
    }
  };

  // Toggle channel role (ADMIN <-> MEMBER)
  const handleToggleChannelRole = async (targetMember) => {
    if (!targetMember) return;
    const newRole = targetMember.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    setIsUpdatingRole(true);
    try {
      await channelApi.updateMemberRole(channelId, targetMember.id, newRole);
      setSelectedMemberToManage(null);
      Alert.alert('Thành công', `Đã cập nhật vai trò của ${targetMember.name || targetMember.username} thành ${newRole === 'ADMIN' ? 'Quản trị viên kênh' : 'Thành viên kênh'}`);
      fetchChannelData();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Lỗi khi cập nhật vai trò trong kênh');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Kick member from this channel
  const handleRemoveFromChannel = async (targetMember) => {
    if (!targetMember) return;
    const confirmMsg = `Bạn có chắc chắn muốn xóa ${targetMember.name || targetMember.username} khỏi kênh #${channelData.name}?`;

    Alert.alert(
      'Xóa khỏi kênh',
      confirmMsg,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa khỏi kênh',
          style: 'destructive',
          onPress: async () => {
            try {
              await channelApi.removeMember(channelId, targetMember.id);
              setSelectedMemberToManage(null);
              Alert.alert('Thành công', `Đã xóa ${targetMember.name || targetMember.username} khỏi kênh`);
              fetchChannelData();
            } catch (err) {
              Alert.alert('Lỗi', err.message || 'Lỗi khi xóa thành viên khỏi kênh');
            }
          },
        },
      ]
    );
  };

  // Delete Channel
  const handleDeleteChannel = () => {
    Alert.alert(
      'Xóa Kênh',
      `Bạn có chắc chắn muốn xóa kênh #${channelData.name}? Mọi tin nhắn trong kênh này sẽ bị xóa vĩnh viễn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteChannel(channelId);
              navigation.navigate('Main');
            } catch (err) {
              Alert.alert('Lỗi', err.message || 'Không thể xóa kênh');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // List of workspace members not yet in this channel
  const availableUsersToInvite = useMemo(() => {
    const existingIds = new Set(channelMembers.map(m => m.id));
    return workspaceMembers.filter(u => !existingIds.has(u.id));
  }, [workspaceMembers, channelMembers]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Header */}
      <Header
        title="Thông tin kênh"
        subtitle={`#${channelData.name}`}
        icon={channelData.type === 'PRIVATE' ? 'lock-closed' : 'chatbubbles'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 2. Channel Hero Card */}
        <View style={styles.heroCard}>
          <LinearGradient colors={THEME.gradientPrimary} style={styles.heroIconBox}>
            <Ionicons
              name={channelData.type === 'PRIVATE' ? 'lock-closed' : 'chatbubble-ellipses'}
              size={26}
              color="#FFFFFF"
            />
          </LinearGradient>
          <Text style={styles.channelTitle}>#{channelData.name}</Text>
          <Text style={styles.workspaceSubtitle}>
            Không gian: {activeWorkspace?.name || 'Workspace'}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, channelData.type === 'PRIVATE' ? styles.badgePrivate : styles.badgePublic]}>
              <Ionicons
                name={channelData.type === 'PRIVATE' ? 'shield-checkmark' : 'globe-outline'}
                size={12}
                color={channelData.type === 'PRIVATE' ? THEME.accent : THEME.primary}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: channelData.type === 'PRIVATE' ? THEME.accent : THEME.primary },
                ]}
              >
                {channelData.type === 'PRIVATE' ? 'Kênh Bảo mật' : 'Kênh Công khai'}
              </Text>
            </View>

            {/* Edit Channel Button (Admins/Creator Only) */}
            {isChannelAdmin && (
              <TouchableOpacity
                style={styles.editChannelBtn}
                onPress={() => setShowEditModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil" size={12} color={THEME.primary} />
                <Text style={styles.editChannelBtnText}>Chỉnh sửa kênh</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Workspace Custom Emoji Bar (Slack-style) */}
        <TouchableOpacity
          style={styles.emojiQuickBar}
          onPress={() => setShowUploadEmojiModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.emojiQuickLeft}>
            <View style={styles.emojiQuickIcon}>
              <Ionicons name="happy" size={16} color={THEME.primary} />
            </View>
            <Text style={styles.emojiQuickTitle}>Custom Emoji ({customEmojis.length})</Text>
          </View>
          <View style={styles.emojiQuickRight}>
            <Text style={styles.emojiQuickActionText}>+ Tải lên Emoji</Text>
            <Ionicons name="chevron-forward" size={14} color={THEME.primary} />
          </View>
        </TouchableOpacity>

        {/* 3. Segmented Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'members' && styles.tabButtonActive]}
            onPress={() => setActiveTab('members')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="people"
              size={16}
              color={activeTab === 'members' ? THEME.primary : THEME.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              Thành viên kênh ({channelMembers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'media' && styles.tabButtonActive]}
            onPress={() => setActiveTab('media')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="images"
              size={16}
              color={activeTab === 'media' ? THEME.primary : THEME.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'media' && styles.tabTextActive]}>
              Tệp & Ảnh ({totalFilesCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Tab Content: Members */}
        {activeTab === 'members' && (
          <View style={styles.section}>
            {/* Add Member Button (For Channel Admins or Private Channels) */}
            {isChannelAdmin && (
              <TouchableOpacity
                style={styles.inviteBtn}
                onPress={() => setShowInviteModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={THEME.gradientPrimary} style={styles.inviteGradient}>
                  <Ionicons name="person-add" size={17} color="#FFFFFF" />
                  <Text style={styles.inviteBtnText}>
                    {channelData.type === 'PRIVATE' ? 'Thêm thành viên vào kênh bí mật' : 'Mời đồng nghiệp vào kênh'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Members List */}
            {isLoadingMembers ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={styles.loadingText}>Đang tải danh sách thành viên kênh...</Text>
              </View>
            ) : (
              <View style={styles.memberListCard}>
                {channelMembers.length === 0 ? (
                  <Text style={styles.emptyMembersText}>Chưa có thành viên nào trong kênh.</Text>
                ) : (
                  channelMembers.map((rawMember) => {
                    const liveMember = workspaceMembers.find(wm => wm.id === rawMember.id);
                    const member = liveMember ? { ...rawMember, ...liveMember, role: rawMember.role } : rawMember;
                    const isCurrentUser = member.id === user?.id;
                    const currentStatus = isCurrentUser ? (user?.status || 'ONLINE') : (member.status || 'ONLINE');
                    const isOnline = isCurrentUser ? currentStatus !== 'OFFLINE' : onlineUsers.has(member.id);
                    const effectiveStatus = (isOnline || currentStatus === 'AWAY' || currentStatus === 'DND')
                      ? currentStatus
                      : 'OFFLINE';
                    const isCreator = member.id === channelData.createdById;
                    const isMemberAdmin = member.role === 'ADMIN' || isCreator;

                    // Compute dynamic status description
                    let statusLabel = effectiveStatus === 'OFFLINE' ? 'Ngoại tuyến' : 'Trực tuyến';
                    let statusColor = effectiveStatus === 'OFFLINE' ? '#6B7280' : '#10B981';
                    if (effectiveStatus === 'AWAY') {
                      statusLabel = 'Vắng mặt';
                      statusColor = '#F59E0B';
                    } else if (effectiveStatus === 'DND') {
                      statusLabel = 'Đừng làm phiền';
                      statusColor = '#EF4444';
                    }

                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={styles.memberRow}
                        disabled={!isChannelAdmin || isCurrentUser}
                        onPress={() => setSelectedMemberToManage(member)}
                        activeOpacity={0.7}
                      >
                        <Avatar
                          uri={member.avatarUrl}
                          name={member.name || member.username}
                          size={38}
                          isOnline={isOnline}
                          status={effectiveStatus}
                        />
                        <View style={styles.memberInfo}>
                          <View style={styles.nameRow}>
                            <Text style={styles.memberName}>
                              {member.name || member.username}
                            </Text>
                            {isMemberAdmin && (
                              <View style={styles.adminBadge}>
                                <Ionicons name="shield-checkmark" size={10} color="#F59E0B" />
                                <Text style={styles.adminBadgeText}>
                                  {isCreator ? 'CREATOR' : 'ADMIN KÊNH'}
                                </Text>
                              </View>
                            )}
                            {isCurrentUser && (
                              <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>BẠN</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.statusRow}>
                            <View style={[styles.statusDotSmall, { backgroundColor: statusColor }]} />
                            <Text style={[styles.memberSub, { color: statusColor }]}>{statusLabel}</Text>
                            {!!member.customStatus && (
                              <Text style={styles.customStatusText} numberOfLines={1}>
                                • "{member.customStatus}"
                              </Text>
                            )}
                            {!!member.title && (
                              <Text style={styles.memberTitleBadge} numberOfLines={1}>
                                [{member.title}]
                              </Text>
                            )}
                          </View>
                        </View>
                        {isChannelAdmin && !isCurrentUser && (
                          <Ionicons name="ellipsis-vertical" size={16} color={THEME.textDim} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* Danger Zone: Delete Channel (Admins Only) */}
            {isChannelAdmin && (
              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>VÙNG QUẢN TRỊ KÊNH</Text>
                <Text style={styles.dangerDesc}>
                  Xóa vĩnh viễn kênh #{channelData.name} cùng toàn bộ tin nhắn và tài liệu đính kèm. Hành động này không thể hoàn tác.
                </Text>
                <TouchableOpacity
                  style={styles.deleteChannelBtn}
                  onPress={handleDeleteChannel}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={styles.deleteChannelText}>XÓA KÊNH NÀY</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 5. Tab Content: Media Gallery & Documents */}
        {activeTab === 'media' && (
          <View style={styles.section}>
            {totalFilesCount === 0 ? (
              <View style={styles.emptyMediaCard}>
                <Ionicons name="folder-open-outline" size={48} color={THEME.textDim} />
                <Text style={styles.emptyMediaTitle}>Chưa có tệp hoặc hình ảnh nào</Text>
                <Text style={styles.emptyMediaDesc}>
                  Các hình ảnh và tệp tài liệu được chia sẻ trong kênh #{channelData.name} sẽ hiển thị tại đây.
                </Text>
              </View>
            ) : (
              <>
                {/* 5.1 Hình ảnh & Media */}
                {channelImages.length > 0 && (
                  <View style={styles.mediaSubSection}>
                    <View style={styles.subSectionHeader}>
                      <Ionicons name="images-outline" size={16} color={THEME.primary} />
                      <Text style={styles.subSectionTitle}>
                        HÌNH ẢNH & MEDIA ({channelImages.length})
                      </Text>
                    </View>
                    <FlatList
                      data={channelImages}
                      keyExtractor={(item) => item.id}
                      numColumns={3}
                      scrollEnabled={false}
                      renderItem={({ item }) => {
                        const safeUrl = item.fileUrl?.startsWith('http://res.cloudinary.com')
                          ? item.fileUrl.replace('http://', 'https://')
                          : item.fileUrl;
                        return (
                          <TouchableOpacity
                            style={styles.gridItem}
                            onPress={() =>
                              setViewerImage({
                                imageUrl: safeUrl,
                                senderName: item.user?.name || item.user?.username,
                                createdAt: item.createdAt || item.createAt,
                              })
                            }
                            activeOpacity={0.8}
                          >
                            <Image source={{ uri: safeUrl }} style={styles.gridImage} resizeMode="cover" />
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                )}

                {/* 5.2 Tệp tin & Tài liệu (PDF, Word, Zip...) */}
                {channelDocs.length > 0 && (
                  <View style={[styles.mediaSubSection, channelImages.length > 0 && { marginTop: 22 }]}>
                    <View style={styles.subSectionHeader}>
                      <Ionicons name="document-text-outline" size={16} color={THEME.secondary} />
                      <Text style={styles.subSectionTitle}>
                        TỆP TIN & TÀI LIỆU ({channelDocs.length})
                      </Text>
                    </View>
                    {channelDocs.map((item) => {
                      const fileDetails = getFileDetails(item.fileUrl);
                      const isPdf = fileDetails.type === 'pdf';
                      const isWord = fileDetails.type === 'word';
                      const isExcel = fileDetails.type === 'excel';
                      const isArchive = fileDetails.type === 'archive';

                      const badgeColor = isPdf ? '#EF4444' : (isWord ? '#3B82F6' : (isExcel ? '#10B981' : (isArchive ? '#A855F7' : THEME.primary)));
                      const iconName = isPdf ? 'document-text' : (isWord ? 'document' : (isExcel ? 'grid' : (isArchive ? 'archive' : 'document-attach')));

                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.docItemCard}
                          onPress={() => handleOpenDoc(item.fileUrl)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.docIconWrap, { backgroundColor: `${badgeColor}20` }]}>
                            <Ionicons name={iconName} size={22} color={badgeColor} />
                          </View>
                          <View style={styles.docInfoWrap}>
                            <Text style={styles.docFileName} numberOfLines={1}>
                              {fileDetails.name}
                            </Text>
                            <Text style={styles.docMetaText}>
                              {item.user?.name || item.user?.username || 'Thành viên'} • {formatMessageTime(item.createdAt || item.createAt)}
                            </Text>
                          </View>
                          <View style={styles.docActionBtn}>
                            <Ionicons name="arrow-down-circle-outline" size={20} color={THEME.primary} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* 6. Edit Channel Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="create" size={20} color={THEME.primary} />
                <Text style={styles.modalTitle}>Chỉnh sửa kênh</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textDim} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>TÊN KÊNH</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputHash}>#</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="vd: du-an-fogchat"
                placeholderTextColor={THEME.textPlaceholder}
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>LOẠI KÊNH (BẢO MẬT)</Text>
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[styles.typeOption, editType === 'PUBLIC' && styles.typeOptionActive]}
                onPress={() => setEditType('PUBLIC')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="globe-outline"
                  size={18}
                  color={editType === 'PUBLIC' ? THEME.primary : THEME.textDim}
                />
                <Text style={[styles.typeOptionText, editType === 'PUBLIC' && styles.typeOptionTextActive]}>
                  Công khai (PUBLIC)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOption, editType === 'PRIVATE' && styles.typeOptionActive]}
                onPress={() => setEditType('PRIVATE')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={editType === 'PRIVATE' ? THEME.accent : THEME.textDim}
                />
                <Text style={[styles.typeOptionText, editType === 'PRIVATE' && styles.typeOptionTextActive]}>
                  Riêng tư (PRIVATE)
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveChannelEdit}
              disabled={isUpdatingChannel}
              activeOpacity={0.85}
            >
              <LinearGradient colors={THEME.gradientPrimary} style={styles.saveBtnGradient}>
                {isUpdatingChannel ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save" size={17} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>LƯU THAY ĐỔI</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 7. Invite Member to Channel Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowInviteModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="person-add" size={20} color={THEME.primary} />
                <Text style={styles.modalTitle}>Thêm thành viên vào kênh</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textDim} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inviteModalSub}>
              Chọn đồng nghiệp trong Không gian làm việc để thêm vào kênh #{channelData.name}:
            </Text>

            <ScrollView style={styles.inviteListScroll}>
              {availableUsersToInvite.length === 0 ? (
                <Text style={styles.emptyInviteText}>Tất cả thành viên trong Workspace đã có mặt trong kênh này.</Text>
              ) : (
                availableUsersToInvite.map((m) => {
                  const isSelected = selectedUserToInvite?.id === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.inviteOption, isSelected && styles.inviteOptionActive]}
                      onPress={() => setSelectedUserToInvite(m)}
                      activeOpacity={0.7}
                    >
                      <Avatar uri={m.avatarUrl} name={m.name || m.username} size={36} />
                      <View style={styles.inviteOptionInfo}>
                        <Text style={styles.inviteOptionName}>{m.name || m.username}</Text>
                        <Text style={styles.inviteOptionEmail}>@{m.username} {m.title ? `• ${m.title}` : ''}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={THEME.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmInviteBtn, !selectedUserToInvite && styles.btnDisabled]}
              onPress={handleInvite}
              disabled={!selectedUserToInvite || isInviting}
              activeOpacity={0.8}
            >
              {isInviting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmInviteText}>Xác nhận thêm vào kênh</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 8. Channel Member Management Action Sheet */}
      <Modal
        visible={!!selectedMemberToManage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMemberToManage(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedMemberToManage(null)}
        >
          <View style={styles.roleCard} onStartShouldSetResponder={() => true}>
            <View style={styles.roleCardHeader}>
              <Avatar
                uri={selectedMemberToManage?.avatarUrl}
                name={selectedMemberToManage?.name || selectedMemberToManage?.username}
                size={44}
              />
              <View style={styles.roleCardInfo}>
                <Text style={styles.roleCardName}>{selectedMemberToManage?.name || selectedMemberToManage?.username}</Text>
                <Text style={styles.roleCardSub}>
                  {selectedMemberToManage?.role === 'ADMIN' ? '👑 Quản trị viên Kênh (ADMIN)' : '👤 Thành viên Kênh (MEMBER)'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedMemberToManage(null)}>
                <Ionicons name="close" size={20} color={THEME.textDim} />
              </TouchableOpacity>
            </View>

            <View style={styles.roleActionsList}>
              {/* Toggle Channel Role */}
              <TouchableOpacity
                style={styles.roleActionItem}
                onPress={() => handleToggleChannelRole(selectedMemberToManage)}
                disabled={isUpdatingRole}
                activeOpacity={0.7}
              >
                <View style={[styles.roleIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
                </View>
                <View style={styles.roleTextWrap}>
                  <Text style={styles.roleActionTitle}>
                    {selectedMemberToManage?.role === 'ADMIN' ? 'Gỡ quyền Quản trị viên kênh' : 'Đặt làm Quản trị viên kênh (ADMIN)'}
                  </Text>
                  <Text style={styles.roleActionSub}>
                    {selectedMemberToManage?.role === 'ADMIN' ? 'Chuyển về thành viên thường của kênh' : 'Cấp quyền quản lý tên kênh và thành viên'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Remove from Channel */}
              <TouchableOpacity
                style={styles.roleActionItem}
                onPress={() => handleRemoveFromChannel(selectedMemberToManage)}
                activeOpacity={0.7}
              >
                <View style={[styles.roleIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="person-remove" size={18} color="#EF4444" />
                </View>
                <View style={styles.roleTextWrap}>
                  <Text style={[styles.roleActionTitle, { color: '#EF4444' }]}>Xóa khỏi kênh #{channelData.name}</Text>
                  <Text style={styles.roleActionSub}>Rút quyền truy cập kênh này của thành viên</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 9. Full-screen Lightbox Media Modal */}
      <MediaViewerModal
        visible={!!viewerImage}
        imageUrl={viewerImage?.imageUrl}
        senderName={viewerImage?.senderName}
        createdAt={viewerImage?.createdAt}
        onClose={() => setViewerImage(null)}
      />

      {/* 10. Upload Custom Emoji Modal */}
      <UploadCustomEmojiModal
        visible={showUploadEmojiModal}
        onClose={() => setShowUploadEmojiModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: THEME.surface,
    padding: 20,
    borderRadius: THEME.radiusLg,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  channelTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  workspaceSubtitle: {
    fontSize: 13,
    color: THEME.textDim,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radiusFull,
    gap: 5,
  },
  badgePublic: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  badgePrivate: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editChannelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radiusFull,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  editChannelBtnText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: THEME.radiusSm,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: THEME.surface,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  tabTextActive: {
    color: THEME.primary,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  inviteBtn: {
    borderRadius: THEME.radiusMd,
    overflow: 'hidden',
    marginBottom: 14,
  },
  inviteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingWrap: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: THEME.textDim,
    fontSize: 12,
  },
  memberListCard: {
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  emptyMembersText: {
    color: THEME.textDim,
    textAlign: 'center',
    padding: 20,
    fontSize: 13,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 3,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  youBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  memberSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  customStatusText: {
    fontSize: 11,
    color: THEME.textDim,
    fontStyle: 'italic',
  },
  memberTitleBadge: {
    fontSize: 10,
    color: THEME.textDim,
    backgroundColor: THEME.surfaceElevated,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dangerZone: {
    marginTop: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 16,
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  dangerDesc: {
    fontSize: 12,
    color: THEME.textDim,
    lineHeight: 18,
    marginBottom: 14,
  },
  deleteChannelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: THEME.radiusSm,
    gap: 6,
  },
  deleteChannelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  emptyMediaCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 10,
  },
  emptyMediaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
  },
  emptyMediaDesc: {
    fontSize: 12,
    color: THEME.textDim,
    textAlign: 'center',
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    padding: 2,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: THEME.surfaceElevated,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: THEME.radiusLg,
    borderTopRightRadius: THEME.radiusLg,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.text,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textDim,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
  },
  inputHash: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.primary,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    height: 44,
    color: THEME.text,
    fontSize: 14,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surfaceElevated,
    paddingVertical: 12,
    borderRadius: THEME.radiusMd,
    borderWidth: 1.5,
    borderColor: THEME.border,
    gap: 6,
  },
  typeOptionActive: {
    borderColor: THEME.primary,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textDim,
  },
  typeOptionTextActive: {
    color: THEME.text,
  },
  saveBtn: {
    borderRadius: THEME.radiusMd,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inviteModalSub: {
    fontSize: 13,
    color: THEME.textDim,
    marginBottom: 12,
  },
  inviteListScroll: {
    maxHeight: 280,
    marginBottom: 16,
  },
  emptyInviteText: {
    color: THEME.textDim,
    textAlign: 'center',
    padding: 24,
    fontSize: 13,
    fontStyle: 'italic',
  },
  inviteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: THEME.radiusMd,
    backgroundColor: THEME.surfaceElevated,
    marginBottom: 8,
    gap: 10,
  },
  inviteOptionActive: {
    borderWidth: 1.5,
    borderColor: THEME.primary,
  },
  inviteOptionInfo: {
    flex: 1,
  },
  inviteOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  inviteOptionEmail: {
    fontSize: 11,
    color: THEME.textDim,
  },
  confirmInviteBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    borderRadius: THEME.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  confirmInviteText: {
    color: '#0B0E14',
    fontSize: 13,
    fontWeight: '800',
  },
  roleCard: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: THEME.radiusLg,
    borderTopRightRadius: THEME.radiusLg,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
  },
  roleCardInfo: {
    flex: 1,
  },
  roleCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
  },
  roleCardSub: {
    fontSize: 12,
    color: THEME.textDim,
    marginTop: 2,
  },
  roleActionsList: {
    paddingTop: 12,
    gap: 8,
  },
  roleActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: THEME.surfaceElevated,
    borderRadius: THEME.radiusMd,
    gap: 12,
  },
  roleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextWrap: {
    flex: 1,
  },
  roleActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  roleActionSub: {
    fontSize: 11,
    color: THEME.textDim,
    marginTop: 2,
  },
  mediaSubSection: {
    width: '100%',
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 0.8,
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  docIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docInfoWrap: {
    flex: 1,
    marginRight: 8,
  },
  docFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 3,
  },
  docMetaText: {
    fontSize: 11,
    color: THEME.textDim,
  },
  docActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  emojiQuickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  emojiQuickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emojiQuickIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiQuickTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  emojiQuickRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emojiQuickActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primary,
  },
});
