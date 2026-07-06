/**
 * Layout nhóm (patient): các màn CHỈ dành cho bệnh nhân đã đăng nhập.
 *
 * Guard: dựa vào AuthContext (đã gọi GET /auth/me lúc mở app). Nếu chưa đăng nhập
 * (user == null) -> redirect về "/" (màn chọn vai trò). isLoading đã được layout gốc
 * xử lý (hiện spinner) nên tới đây chỉ còn 2 trạng thái: có user / không có user.
 */

import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/src/context/AuthContext';

export default function PatientLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
