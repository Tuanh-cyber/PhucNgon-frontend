/**
 * Màn Đăng nhập ("Đã có tài khoản") — giao diện theo màn landing (chọn vai trò):
 * logo PHỤC NGÔN chữ tím lớn + slogan "Restoring voices, reconnecting lives", nền trắng
 * thoáng, ô nhập bo tròn, nút Đăng nhập lớn màu xanh lá, link quay lại chọn vai trò.
 *
 * Logic GIỮ NGUYÊN:
 * - Gọi src/api/auth.ts -> login(); thành công thì useAuth().login(token) rồi vào /home.
 * - 401 -> ưu tiên message detail từ backend; không có response -> báo lỗi mạng.
 *
 * Placeholder "Ví dụ: ..." mờ + in nghiêng khi ô trống (giống form đăng ký).
 */

import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import axios from 'axios';

import { login as loginApi } from '@/src/api/auth';
import { useAuth } from '@/src/context/AuthContext';

const GREEN = '#1f7a4d';
const PURPLE = '#7C4DFF';
const PLACEHOLDER_COLOR = '#9a9a9a';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const { access_token, role } = await loginApi({ email, password });
      await login(access_token);
      // Điều hướng theo ROLE: bác sĩ -> web bác sĩ /doctor; bệnh nhân -> app như cũ.
      router.replace(role === 'therapist' ? '/doctor' : '/(patient)/home');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          // Sai email/mật khẩu: ưu tiên message backend trả trong detail; thiếu -> câu mặc định.
          const detail = (err.response.data as { detail?: string } | undefined)?.detail;
          setError(
            typeof detail === 'string' && detail
              ? detail
              : 'Email hoặc mật khẩu không đúng. Vui lòng nhập lại.',
          );
        } else if (!err.response) {
          // Không có response = lỗi mạng / server không chạy.
          setError('Không kết nối được máy chủ. Kiểm tra kết nối và thử lại.');
        } else {
          setError('Đăng nhập thất bại. Vui lòng thử lại.');
        }
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo + slogan — giống màn landing */}
      <Text style={styles.brand}>PHỤC NGÔN</Text>
      <Text style={styles.slogan}>Restoring voices, reconnecting lives</Text>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, !email && styles.inputPlaceholder]}
            placeholder="Ví dụ: nguyenvana@email.com"
            placeholderTextColor={PLACEHOLDER_COLOR}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={[styles.input, !password && styles.inputPlaceholder]}
            placeholder="Nhập mật khẩu của bạn"
            placeholderTextColor={PLACEHOLDER_COLOR}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </Pressable>
      </View>

      <Link href="/" style={styles.backLink}>
        ‹ Quay lại chọn vai trò
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 48,
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  brand: {
    fontSize: 46,
    fontWeight: 'bold',
    textAlign: 'center',
    color: PURPLE,
    letterSpacing: 1,
  },
  slogan: {
    fontSize: 16,
    textAlign: 'center',
    color: '#8a7bd8',
    marginBottom: 28,
  },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 15, fontWeight: '600', color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  // Placeholder in nghiêng khi ô trống; gõ vào tự thành chữ thẳng.
  inputPlaceholder: { fontStyle: 'italic' },
  error: { color: '#D64545', fontSize: 15 },
  button: {
    backgroundColor: GREEN,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backLink: {
    marginTop: 24,
    fontSize: 16,
    textAlign: 'center',
    color: GREEN,
    textDecorationLine: 'underline',
  },
});
