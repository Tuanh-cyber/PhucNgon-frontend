/**
 * AuthContext — nguồn sự thật về phiên đăng nhập cho toàn app.
 *
 * - user: thông tin từ GET /auth/me (hoặc null nếu chưa/không đăng nhập).
 * - isLoading: TRUE trong lúc mở app đang dò token đã lưu (chưa biết vào app hay ra màn chọn
 *   vai trò). Layout gốc dựa vào cờ này để hiện spinner.
 * - login(token): lưu token, gọi getMe(), set user.
 * - logout(): xoá token, set user = null.
 *
 * Lúc mount: đọc token đã lưu -> nếu có thì gọi GET /auth/me:
 *   200 -> set user (vào thẳng app).
 *   401 -> token hết hạn: interceptor đã xoá token; set user = null (hiện màn chọn vai trò).
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getMe } from '@/src/api/auth';
import { deleteToken, getToken, saveToken } from '@/src/api/storage';
import type { MeResponse } from '@/src/types/api';

interface AuthContextValue {
  user: MeResponse | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dò token đã lưu 1 lần lúc mở app.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (active) setUser(null);
          return;
        }
        // skipRedirectOn401=true: để CHÍNH context này quyết định routing, không để
        // interceptor tự đá về màn đăng nhập.
        const me = await getMe(true);
        if (active) setUser(me);
      } catch {
        // 401 hoặc lỗi mạng -> coi như chưa đăng nhập. Token 401 đã bị interceptor xoá.
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function login(token: string): Promise<void> {
    await saveToken(token);
    const me = await getMe();
    setUser(me);
  }

  async function logout(): Promise<void> {
    await deleteToken();
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook dùng chung: mọi màn hình gọi useAuth() để lấy user/login/logout. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth() phải được dùng bên trong <AuthProvider>');
  }
  return ctx;
}
