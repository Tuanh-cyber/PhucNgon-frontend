/**
 * API Auth: đăng ký / đăng nhập / kiểm tra phiên.
 * Khớp docs/API_CONTRACT.md phần 1.
 */

import { apiClient } from './client';
import type {
  LoginRequest,
  MeResponse,
  PatientRegisterRequest,
  TherapistRegisterRequest,
  TokenResponse,
} from '@/src/types/api';

/** POST /auth/register/patient */
export async function registerPatient(
  body: PatientRegisterRequest,
): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>('/auth/register/patient', body);
  return res.data;
}

/** POST /auth/register/therapist */
export async function registerTherapist(
  body: TherapistRegisterRequest,
): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>('/auth/register/therapist', body);
  return res.data;
}

/** POST /auth/login */
export async function login(body: LoginRequest): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>('/auth/login', body);
  return res.data;
}

/**
 * GET /auth/me — kiểm tra token còn hợp lệ.
 * skipRedirectOn401=true khi dùng lúc mở app để AuthContext tự quyết định routing
 * (không để interceptor tự đá về màn đăng nhập).
 */
export async function getMe(skipRedirectOn401 = false): Promise<MeResponse> {
  const res = await apiClient.get<MeResponse>('/auth/me', {
    skipAuthRedirect: skipRedirectOn401,
  });
  return res.data;
}

/** POST /auth/change-password — user đang đăng nhập tự đổi mật khẩu. 400 = current sai. */
export async function changePassword(body: {
  current_password: string;
  new_password: string;
}): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>('/auth/change-password', body);
  return res.data;
}
