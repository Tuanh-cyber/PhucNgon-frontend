/**
 * Axios instance dùng chung cho mọi API call.
 *
 * - baseURL đọc từ biến môi trường Expo public EXPO_PUBLIC_API_URL (đọc được cả web lẫn app).
 * - Request interceptor: tự đính token (nếu có) vào header Authorization: Bearer <token>.
 * - Response interceptor: bắt lỗi 401 tập trung 1 chỗ — xoá token đã lưu và điều hướng về
 *   màn đăng nhập. Riêng lần "dò token" lúc mở app (AuthContext) sẽ tự xử lý routing nên
 *   truyền cờ skipAuthRedirect để interceptor KHÔNG tự điều hướng, tránh đá nhau.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';

import { deleteToken, getToken } from './storage';

// Cho phép gắn cờ skipAuthRedirect lên từng request config.
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

/**
 * Ghép đường dẫn tương đối backend trả về (vd "/static/pictures/Object/VOB1001.jpg")
 * thành URL đầy đủ để <Image>/Audio dùng được. null/undefined -> null (asset thiếu,
 * caller hiện placeholder/ẩn nút thay vì gọi URL 404).
 */
export function buildAssetUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  // Đã là URL tuyệt đối thì giữ nguyên.
  if (/^https?:\/\//.test(relativePath)) return relativePath;
  return `${baseURL}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}

// ── Request: đính token ─────────────────────────────────────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ── Response: xử lý 401 tập trung ───────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // NGOẠI LỆ /auth/login: 401 ở đây nghĩa là "sai email/mật khẩu" (không phải token
      // hết hạn) — KHÔNG xoá token, KHÔNG redirect, ném nguyên lỗi lên cho màn login
      // đọc detail và hiển thị. Nếu không có ngoại lệ này, interceptor sẽ redirect ngay
      // trên chính màn login (vô nghĩa) và có thể che mất message lỗi.
      const isLoginCall = (error.config?.url ?? '').includes('/auth/login');
      if (!isLoginCall) {
        // Token sai/hết hạn -> xoá để không dùng lại.
        await deleteToken();
        // Không tự điều hướng nếu caller tự lo (vd lần dò token lúc mở app).
        if (!error.config?.skipAuthRedirect) {
          router.replace('/(auth)/login');
        }
      }
    }
    return Promise.reject(error);
  },
);
