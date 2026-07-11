/**
 * Cửa BÁC SĨ — route công khai tại /bacsi (bệnh nhân không thấy nút này ở landing;
 * bác sĩ được phát link trực tiếp).
 *
 * 2 tab: "Đăng nhập" (email + mật khẩu -> /auth/login; role therapist -> /doctor,
 * role khác -> app bệnh nhân như role routing chung) và "Đăng ký" (full_name, email,
 * password, license_no BẮT BUỘC; phone/specialization optional ->
 * POST /auth/register/therapist — backend KHÔNG nhận qualification/organization).
 * Đăng ký trả token -> AUTO-LOGIN -> thẳng /doctor.
 */

import axios from 'axios';
import { useRouter } from 'expo-router';
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

import { login as loginApi, registerTherapist } from '@/src/api/auth';
import { useAuth } from '@/src/context/AuthContext';

const GREEN = '#1B5E3A';
const GREEN_LIGHT = '#2E7D32';
const PLACEHOLDER = '#9a9a9a';

export default function DoctorGateScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đăng nhập
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Đăng ký thêm:
  const [fullName, setFullName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone] = useState('');

  async function onLogin() {
    setError(null);
    setSubmitting(true);
    try {
      const { access_token, role } = await loginApi({ email: email.trim(), password });
      await login(access_token);
      // Role routing thống nhất với màn login chung.
      router.replace(role === 'therapist' ? '/doctor' : '/(patient)/home');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Email hoặc mật khẩu không đúng.');
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onRegister() {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password || !licenseNo.trim()) {
      setError('Vui lòng điền đủ: Họ tên, Email, Mật khẩu, Số giấy phép hành nghề.');
      return;
    }
    setSubmitting(true);
    try {
      const { access_token } = await registerTherapist({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        license_no: licenseNo.trim(),
        specialization: specialization.trim() || undefined,
        phone_number: phone.trim() || undefined,
      });
      // Backend trả token ngay -> auto-login, vào thẳng dashboard bác sĩ.
      await login(access_token);
      router.replace('/doctor');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError('Email này đã được đăng ký. Chuyển sang tab Đăng nhập.');
      } else if (axios.isAxiosError(err) && err.response?.status === 422) {
        setError('Dữ liệu chưa hợp lệ. Kiểm tra lại email/mật khẩu/giấy phép.');
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = tab === 'login';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.brand}>PHỤC NGÔN</Text>
      <Text style={styles.subtitle}>Cổng dành cho BÁC SĨ / CHUYÊN VIÊN TRỊ LIỆU</Text>

      {/* Tab chuyển Đăng nhập / Đăng ký */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, isLogin && styles.tabActive]}
          onPress={() => {
            setTab('login');
            setError(null);
          }}
        >
          <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Đăng nhập</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, !isLogin && styles.tabActive]}
          onPress={() => {
            setTab('register');
            setError(null);
          }}
        >
          <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Đăng ký</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Họ và tên (bắt buộc)"
            placeholderTextColor={PLACEHOLDER}
            value={fullName}
            onChangeText={setFullName}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email (bắt buộc)"
          placeholderTextColor={PLACEHOLDER}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu (bắt buộc)"
          placeholderTextColor={PLACEHOLDER}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {!isLogin && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Số giấy phép hành nghề (bắt buộc)"
              placeholderTextColor={PLACEHOLDER}
              value={licenseNo}
              onChangeText={setLicenseNo}
            />
            <TextInput
              style={styles.input}
              placeholder="Chuyên khoa (tuỳ chọn)"
              placeholderTextColor={PLACEHOLDER}
              value={specialization}
              onChangeText={setSpecialization}
            />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại (tuỳ chọn)"
              placeholderTextColor={PLACEHOLDER}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.submitBtn, submitting && styles.disabled]}
          onPress={isLogin ? onLogin : onRegister}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {isLogin ? 'Đăng nhập bác sĩ' : 'Đăng ký & vào bảng điều khiển'}
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable onPress={() => router.replace('/')}>
        <Text style={styles.patientLink}>‹ Tôi là bệnh nhân (về trang chính)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 64,
    gap: 16,
    backgroundColor: '#EAF3ED',
    alignItems: 'center',
  },
  brand: { fontSize: 38, fontWeight: 'bold', color: GREEN, letterSpacing: 1 },
  subtitle: { fontSize: 15, color: '#476b57', fontWeight: '600' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#d6e6dc',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
    width: '100%',
    maxWidth: 420,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#557' },
  tabTextActive: { color: GREEN },

  form: { width: '100%', maxWidth: 420, gap: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cfe0d5',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  error: { color: '#D64545', fontSize: 14, fontWeight: '600' },
  submitBtn: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: GREEN,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
  patientLink: { fontSize: 14, color: '#557', textDecorationLine: 'underline', marginTop: 8 },
});
