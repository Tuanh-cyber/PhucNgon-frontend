/**
 * Lưu/đọc/xoá access token — cross-platform.
 *
 * expo-secure-store KHÔNG chạy trên web (chỉ có trên iOS/Android). Vì app dùng chung 1
 * codebase cho cả mobile lẫn web, ta chọn nơi lưu theo nền tảng:
 *   - Mobile (iOS/Android): expo-secure-store (an toàn, lưu trong Keychain/Keystore).
 *   - Web: AsyncStorage (map sang localStorage của trình duyệt).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'phucngon_access_token';
const isWeb = Platform.OS === 'web';

export async function saveToken(token: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
