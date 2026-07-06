/**
 * Layout nhóm (auth): các màn công khai (chưa đăng nhập) — login, đăng ký.
 * Stack đơn giản, có header để nút back hoạt động.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: true, title: '' }} />;
}
