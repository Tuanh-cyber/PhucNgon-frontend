# PhụcNgôn — Frontend (Expo)

App di động + web dùng chung 1 codebase (Expo / React Native + React Native Web), routing
theo file (Expo Router). Đây là phần **khung** (routing, API client, lưu token, type khớp
backend) + 2 màn xác nhận khung chạy đúng (Chọn vai trò, Đăng nhập).

## Cài đặt

```bash
npm install
cp .env.example .env      # rồi sửa EXPO_PUBLIC_API_URL trỏ tới backend đang chạy
```

## Chạy thử

```bash
npx expo start          # quét QR code bằng Expo Go để test trên ĐIỆN THOẠI THẬT
npx expo start --web    # mở thẳng trên TRÌNH DUYỆT
```

> **Điện thoại thật (Expo Go):** trong `.env`, đổi `127.0.0.1` thành **IP LAN** của máy tính
> (vd `http://192.168.1.10:8000`). `127.0.0.1` trên điện thoại là ám chỉ chính điện thoại,
> không tới được backend chạy trên máy tính.

## Cấu trúc

```
app/                     Expo Router — mỗi file = 1 màn hình
  _layout.tsx            layout gốc, bọc AuthProvider + màn loading khi dò token
  index.tsx              Chọn vai trò (bệnh nhân / bác sĩ)
  (auth)/                màn công khai: login, register-step1, register-step2
  (patient)/             màn cần đăng nhập (guard qua AuthContext): home, exercises,
                         initial-assessment
src/
  api/       client.ts (axios + interceptor token/401), auth/plans/attempts/assessment,
             storage.ts (SecureStore trên mobile, AsyncStorage trên web)
  types/     api.ts — interface khớp docs/API_CONTRACT.md
  context/   AuthContext.tsx — lưu token, hook useAuth()
docs/        API_CONTRACT.md + ảnh mockup UI (nguồn sự thật)
```

## Ghi chú kỹ thuật

- **Token:** `expo-secure-store` trên iOS/Android; trên web tự động dùng `AsyncStorage`
  (localStorage) vì SecureStore không có trên web.
- **Kiểm tra phiên:** mở app -> `AuthContext` đọc token đã lưu -> gọi `GET /auth/me`.
  200 vào thẳng app, 401 xoá token và hiện màn chọn vai trò.
- **Biến môi trường:** dùng tiền tố `EXPO_PUBLIC_` để đọc được ở cả web lẫn app.
