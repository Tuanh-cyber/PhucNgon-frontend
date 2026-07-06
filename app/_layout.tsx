/**
 * Layout gốc: bọc toàn app trong <AuthProvider>.
 *
 * Trong lúc AuthContext đang dò token (isLoading), hiện 1 màn loading đơn giản
 * (spinner + "Đang tải...") — CHƯA cần đẹp, chỉ cần chạy đúng.
 */

import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { RegistrationProvider } from '@/src/context/RegistrationContext';

function RootNavigator() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  // headerShown=false ở gốc; từng nhóm route tự quyết header nếu cần.
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  // RegistrationProvider bọc bên trong AuthProvider: 2 màn đăng ký cần cả login() (từ Auth)
  // lẫn kho dữ liệu tạm (từ Registration). Đặt trong AuthProvider để không phá luồng auth sẵn có.
  return (
    <AuthProvider>
      <RegistrationProvider>
        <RootNavigator />
      </RegistrationProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
});
