# 📱 FogChat Mobile - Ứng dụng Giao tiếp Thời gian thực (React Native)

FogChat Mobile là phiên bản ứng dụng di động hoàn chỉnh của hệ thống FogChat, được xây dựng bằng **React Native (Expo SDK 58)** với phong cách thiết kế **Cyber Dark Obsidian & Neon Accent** hiện đại.

---

## 🎨 Điểm nổi bật về Giao diện & Trải nghiệm (UI/UX)
1. **Bảng màu cao cấp (High-End Dark Palette):**
   - Nền đen Obsidian (`#0B0E14`), thẻ nổi Surface (`#131822`), viền neon tinh tế.
   - Điểm nhấn Cyan năng động (`#06B6D4`) và Electric Violet (`#8B5CF6`).
2. **Khung chat thông minh (Intelligent Chat Experience):**
   - Phân biệt rõ ràng bong bóng tin nhắn của mình (Cyan gradient) và đồng nghiệp (Sleek Slate).
   - **Gợi ý Custom Emoji (`:`) và Tag tên (`@`) tự động:** Gõ `:` hoặc `@` sẽ xuất hiện thanh popup gợi ý nổi ngay trên bàn phím.
   - **Thả cảm xúc đa dạng:** Hỗ trợ cả Emoji chuẩn lẫn Custom Emoji tải lên từ Workspace.
   - **Thảo luận theo luồng (Thread):** Màn hình thảo luận riêng biệt cho từng tin nhắn, không làm trôi dòng chat chính.
   - **Trạng thái đang gõ (Real-time Typing):** Hiển thị trực quan `[Tên] đang gõ...`.
3. **Điều hướng chuẩn Mobile:**
   - Bottom Tab bar 3 tab (Kênh, Nhắn riêng, Cá nhân) với hiệu ứng chạm mượt mà.
   - Tối ưu hóa vùng an toàn (Safe Area Context) cho các dòng máy tai thỏ / Dynamic Island.
   - Xử lý bàn phím ảo (Keyboard Avoiding) không che khuất tin nhắn.
4. **Bộ cấu hình Server linh hoạt:**
   - Tích hợp nút đổi IP máy chủ ngay trên màn hình Đăng nhập và Cá nhân, giúp demo trên điện thoại thật qua mạng Wifi nội bộ cực kỳ dễ dàng.

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy (Quick Start)

### Yêu cầu môi trường:
- **Node.js** >= 18.x
- Máy tính và điện thoại kết nối **cùng một mạng Wifi** (nếu test trên điện thoại thật).

### Bước 1: Cài đặt thư viện (nếu clone mới)
```bash
cd FogChat_Mobile
npm install
```

### Bước 2: Khởi chạy ứng dụng
Chạy lệnh khởi động Expo:
```bash
npm start
# hoặc
npx expo start
```

### Bước 3: Trải nghiệm & Demo
Sau khi giao diện Expo Terminal hiện lên, bạn có các lựa chọn:
- **Cách 1 (Khuyên dùng - Trên điện thoại thật):**
  1. Cài ứng dụng **Expo Go** từ Google Play Store (Android) hoặc App Store (iOS).
  2. Mở Camera (iOS) hoặc quét mã QR trong app Expo Go (Android) để mở ứng dụng ngay trên điện thoại.
  3. Tại màn hình Đăng nhập của FogChat Mobile, bấm vào thanh `Server: http://...` ở trên cùng và nhập địa chỉ IP máy tính của bạn (VD: `http://192.168.1.15:5000`).
- **Cách 2 (Trên trình duyệt máy tính):**
  - Nhấn phím `w` trong Terminal để mở chế độ Web preview.
- **Cách 3 (Trên máy ảo Android Emulator):**
  - Nhấn phím `a` trong Terminal.

---

## 📂 Cấu trúc thư mục (Architecture)
```text
FogChat_Mobile/
├── assets/                    # Biểu tượng, splash screen
├── src/
│   ├── config/
│   │   └── theme.js           # Bảng màu, typography, khoảng cách
│   ├── services/
│   │   ├── api.js             # Axios client, interceptors, REST endpoints
│   │   ├── socket.js          # Socket.io client, realtime event listeners
│   │   └── storage.js         # AsyncStorage token & user state
│   ├── context/
│   │   ├── AuthContext.js     # Quản lý phiên đăng nhập & JWT
│   │   └── ChatContext.js     # Quản lý kênh, tin nhắn, presence, thread
│   ├── components/
│   │   ├── Avatar.js          # Avatar có chấm online real-time
│   │   ├── Header.js          # Header navigation
│   │   ├── MessageBubble.js   # Bong bóng chat, reactions, media
│   │   ├── ChatInput.js       # Thanh nhập chat, autocomplete popup
│   │   └── ReactionPickerModal.js # Action sheet cảm xúc, sửa, xóa
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   ├── main/
│   │   │   ├── ChannelListScreen.js
│   │   │   ├── DirectMessagesScreen.js
│   │   │   └── ProfileScreen.js
│   │   ├── chat/
│   │   │   ├── ChatRoomScreen.js
│   │   │   └── ThreadScreen.js
│   │   └── modals/
│   │       ├── CreateChannelModal.js
│   │       └── ServerConfigModal.js
│   └── navigation/
│       ├── MainTabs.js        # Bottom Tab Navigator
│       └── RootNavigator.js   # Native Stack Navigator
├── App.js                     # Root Component
├── app.json                   # Cấu hình Expo App
└── package.json
```
