# 📱 FogChat Mobile — Ứng dụng Nhắn tin Nội bộ Thời gian thực (React Native)

**FogChat Mobile** là ứng dụng di động (hỗ trợ **Android, iOS và Expo Web**) của hệ thống giao tiếp nội bộ **FogChat**, được xây dựng bằng **React Native (Expo SDK 58)** theo kiến trúc phân tầng (**Clean Layered Architecture**) và phong cách giao diện **Cyber Dark Obsidian & Neon Accent**.

---

## 🛠️ Công nghệ sử dụng

- **Framework:** React Native `0.88.1` + Expo `~58.0.25` + React `19.3.0`
- **Navigation:** React Navigation v7 (`@react-navigation/native-stack` & `@react-navigation/bottom-tabs`)
- **State Management:** React Context API (`AuthContext`, `ChatContext`) + Custom Hooks
- **Networking & Real-time:** Axios (`apiClient` kèm JWT & 401 Interceptors) + `socket.io-client` `^4.8.4`
- **Storage & Native APIs:** `@react-native-async-storage/async-storage` (kèm `localStorage` fallback trên Web), `expo-image-picker`, `expo-document-picker`, `expo-clipboard`, `expo-linear-gradient`, `react-native-safe-area-context`

---

## ✨ Tính năng nổi bật

1. **Giao diện Dark Obsidian đồng bộ & tối ưu Mobile:**
   - Bảng màu tập trung trong `src/config/theme.js`, hỗ trợ vùng an toàn (`SafeAreaProvider`) cho tai thỏ / Dynamic Island và xử lý bàn phím ảo (`useKeyboard`, `KeyboardAvoidingView`).
2. **Điều hướng 4 Tab chính (`MainTabs`) + Stack chuyên sâu:**
   - **Kênh (`ChannelsTab`):** Chọn/chuyển nhiều Workspace, xem kênh `PUBLIC`/`PRIVATE`, huy hiệu số tin chưa đọc, tạo kênh mới, tạo/tham gia Workspace bằng mã mời, bảng quản trị nhân sự (`WorkspaceAdminModal`) và tìm kiếm tin nhắn toàn Workspace.
   - **Nhắn riêng (`DirectMessagesTab`):** Danh sách đồng nghiệp trong Workspace hiện tại kèm trạng thái online real-time để mở nhanh phòng chat DM 1-1.
   - **Đã lưu (`SavedMessagesTab`):** Quản lý danh sách tin nhắn đã bookmark và chạm để nhảy thẳng về đúng phòng chat.
   - **Cá nhân (`ProfileTab`):** Đổi trạng thái (`ONLINE`, `AWAY`, `DND`, `OFFLINE`), cập nhật hồ sơ, đổi avatar, đổi mật khẩu (`EditProfileScreen`) và đăng xuất.
3. **Phòng chat Real-time đầy đủ (`ChatRoomScreen` & `ThreadScreen`):**
   - Bong bóng tin nhắn tối ưu hiệu năng (`React.memo`), phân cách ngày tiếng Việt (`Hôm nay`, `Hôm qua`), tin nhắn hệ thống căn giữa.
   - **Thanh nhập chat thông minh (`chat-input/`):** Gợi ý tự động `@mention` khi gõ `@`, `:custom_emoji:` khi gõ `:`, khay emoji nhanh, đính kèm ảnh/tệp tin (`AttachmentPreview`) và banner trạng thái đang sửa / trả lời.
   - **Thảo luận Thread, Ghim, Reaction & Read Receipts:** Nhấn giữ tin nhắn mở `ReactionPickerModal`, xem ai đã thả cảm xúc (`ReactionDetailsModal`), ai đã xem (`ReadReceiptsModal`), xem ảnh full-screen & tải file (`MediaViewerModal`), xem thông báo tin nhắn mới nổi ở đầu màn hình (`InAppNotificationBanner`) và quản lý chi tiết kênh (`ChannelDetailsScreen`).
4. **Kết nối Backend linh hoạt:**
   - Tự động dò địa chỉ IP LAN của máy tính từ Expo Metro `hostUri` (hoặc lấy từ biến `EXPO_PUBLIC_API_URL`, hoặc `http://localhost:5000` trên Web) trong `src/config/theme.js`, đồng thời cho phép chỉnh thủ công URL Server ngay tại màn hình Đăng ký (`RegisterScreen`).

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### Yêu cầu môi trường
- **Node.js** >= 18.x
- Backend **FogChat Server** đang chạy (mặc định cổng `5000`)
- Máy tính và điện thoại dùng chung mạng Wi-Fi (nếu chạy trên điện thoại thật qua Expo Go)

### Bước 1: Cài đặt thư viện
```bash
npm install
```

### Bước 2: Cấu hình địa chỉ Server (tùy chọn)
App tự động nhận IP từ Expo Metro khi bạn chạy LAN. Nếu cần trỏ cố định tới một URL backend khác (ví dụ tunnel `ngrok` hoặc IP riêng), bạn có thể:
- Tạo file `.env` (hoặc truyền biến môi trường) với `EXPO_PUBLIC_API_URL=http://<IP_MAY_TINH>:5000`
- Hoặc chỉnh trực tiếp trên UI ở nút **Server** trong màn hình **Đăng ký**.

### Bước 3: Khởi chạy Expo
```bash
npm start
# Hoặc chạy trực tiếp theo nền tảng:
npm run android
npm run ios
npm run web
```

Sau khi Expo CLI hiển thị QR code:
- **Điện thoại thật:** Cài ứng dụng **Expo Go** (Android/iOS) và quét mã QR.
- **Trình duyệt Web:** Nhấn phím `w` trong terminal (hoặc chạy `npm run web`).
- **Android Emulator:** Nhấn phím `a` trong terminal.

---

## 📂 Cấu trúc thư mục

```text
FogChat_Mobile/
├── App.js                              # Root component: SafeAreaProvider -> AuthProvider -> ChatProvider -> NavigationContainer
├── index.js                            # Entry point đăng ký ứng dụng với Expo
├── app.json                            # Cấu hình Expo (tên app, dark theme, icons, bundle ID / package)
├── package.json
├── assets/                             # Biểu tượng app, adaptive icon Android, splash icon, web favicon
└── src/
    ├── config/
    │   └── theme.js                    # THEME palette & getServerUrl() -> DEFAULT_SERVER_URL
    ├── constants/
    │   ├── emojis.js                   # SYSTEM_EMOJIS & QUICK_REACTIONS
    │   ├── events.js                   # Hằng số SOCKET_EVENTS khớp với server
    │   └── storageKeys.js              # STORAGE_KEYS cho AsyncStorage / localStorage
    ├── hooks/
    │   ├── useDebounce.js              # Trì hoãn giá trị tìm kiếm
    │   └── useKeyboard.js              # Theo dõi trạng thái & chiều cao bàn phím thiết bị
    ├── utils/
    │   ├── date.js                     # formatMessageTime, formatRelativeTime, formatMessageDateHeader
    │   └── emoji.js                    # parseMessageContent() tách text / :shortcode: / @mention
    ├── services/
    │   ├── storage.js                  # Lớp lưu trữ đa nền tảng (AsyncStorage / localStorage / RAM cache)
    │   ├── api.js                      # Axios client + 7 REST modules (auth, user, workspace, channel, message, emoji, upload)
    │   └── socket.js                   # Singleton SocketService quản lý kết nối, listeners & auto re-join rooms
    ├── context/
    │   ├── AuthContext.js              # Phiên đăng nhập, bootstrap token, force_logout, updateServer
    │   └── ChatContext.js              # Workspaces, channels, messages, presence, unreadCounts & socket listeners
    ├── navigation/
    │   ├── RootNavigator.js            # Auth Stack (Login, Register) vs App Stack (Main, ChatRoom, Thread, ChannelDetails, EditProfile, SavedMessages)
    │   └── MainTabs.js                 # 4 tab chính: ChannelsTab, DirectMessagesTab, SavedMessagesTab, ProfileTab
    ├── components/
    │   ├── Avatar.js                   # Avatar ảnh / chữ cái viết tắt + chấm online
    │   ├── Header.js                   # Header tương thích SafeArea
    │   ├── InAppNotificationBanner.js  # Banner thông báo tin nhắn mới nổi trên đầu app
    │   ├── MessageBubble.js            # Bong bóng tin nhắn (React.memo)
    │   ├── ReactionPickerModal.js      # Action sheet nhấn giữ tin nhắn + emoji picker
    │   ├── ChatInput.js                # Barrel re-export ./chat-input
    │   ├── chat-input/                 # index.js, AttachmentPreview.js, BannerBar.js, EmojiSuggestions.js, MentionSuggestions.js, QuickEmojiTray.js
    │   └── modals/                     # index.js, MediaViewerModal.js, ReactionDetailsModal.js, ReadReceiptsModal.js, UserProfileModal.js
    └── screens/
        ├── auth/                       # LoginScreen.js, RegisterScreen.js
        ├── main/                       # ChannelListScreen.js, DirectMessagesScreen.js, SavedMessagesScreen.js, ProfileScreen.js
        ├── chat/                       # ChatRoomScreen.js, ThreadScreen.js, ChannelDetailsScreen.js
        ├── profile/                    # EditProfileScreen.js
        └── modals/                     # CreateWorkspaceModal.js, WorkspaceAdminModal.js, CreateChannelModal.js, PinnedMessagesModal.js, SearchMessagesModal.js, UploadCustomEmojiModal.js
```
