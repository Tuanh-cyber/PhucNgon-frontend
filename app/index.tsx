/**
 * Màn "Chọn vai trò" — màn hình đầu tiên khi mở app (landing).
 *
 * App này CHỈ dành cho BỆNH NHÂN (bác sĩ dùng web riêng) -> đã gỡ hoàn toàn nút
 * "Tôi là bác sĩ" và route therapist. Chỉ còn 1 nút "Tôi là bệnh nhân".
 *
 * Thiết kế:
 *   - Nền = màu XANH LÁ bệnh nhân (#1f7a4d) làm NHẠT (tint sáng) để watermark thấy được.
 *   - Watermark chữ "PHỤC NGÔN" chìm ở giữa, phía sau nội dung (opacity ~0.06, không bắt chạm).
 *     (Chưa có file logo -> tạm dùng chữ; thay logo chính thức sau.)
 *   - Nút "Tôi là bệnh nhân" màu TÍM (#7C4DFF) -> /register-step1?role=patient
 *   - Link "Đã có tài khoản? Đăng nhập" -> /login
 */

import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Bảng màu (giữ đồng bộ toàn app).
const PURPLE = '#7C4DFF';        // (B) màu tím — nút bệnh nhân giờ dùng màu này
const PURPLE_DEEP = '#6A3DE8';
const PURPLE_SOFT = '#8a7bd8';
const GREEN = '#1f7a4d';         // (A) màu xanh lá bệnh nhân — dùng cho watermark + nền (tint)
const GREEN_TINT_BG = '#E6F5EC'; // nền = màu (A) làm nhạt sáng

export default function RoleSelectScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Watermark logo chìm — phía sau nội dung, không bắt sự kiện chạm */}
      <View style={styles.watermarkLayer} pointerEvents="none">
        <Text style={styles.watermarkText}>PHỤC NGÔN</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.brand}>PHỤC NGÔN</Text>
        <Text style={styles.tagline}>Restoring voices, reconnecting lives</Text>
      </View>

      <View style={styles.spacer} />

      <Pressable
        style={styles.button}
        onPress={() => router.push('/(auth)/register-step1?role=patient')}
      >
        <Text style={styles.buttonTitle}>Tôi là bệnh nhân</Text>
        <Text style={styles.buttonSubtitle}>Luyện tập & Theo dõi tiến trình</Text>
      </Pressable>

      <Link href="/(auth)/login" style={styles.loginLink}>
        Đã có tài khoản? Đăng nhập
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
    backgroundColor: GREEN_TINT_BG,
  },
  // Lớp watermark phủ toàn màn, canh giữa, nằm dưới cùng (render trước -> z thấp nhất).
  watermarkLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: GREEN,
    opacity: 0.06,
    letterSpacing: 2,
    textAlign: 'center',
  },
  header: { gap: 10 },
  brand: {
    fontSize: 46,
    fontWeight: 'bold',
    textAlign: 'center',
    color: PURPLE,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 17,
    textAlign: 'center',
    color: PURPLE_SOFT,
  },
  spacer: { flex: 1 },
  // Nút bệnh nhân: TÍM đặc, chunky (cạnh dưới dày -> nổi khối), chữ trắng tương phản cao.
  button: {
    backgroundColor: PURPLE,
    borderRadius: 18,
    borderBottomWidth: 6,
    borderBottomColor: PURPLE_DEEP,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
    marginBottom: 18,
  },
  buttonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonSubtitle: {
    fontSize: 15,
    color: '#EDE7FF',
  },
  loginLink: {
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
    color: PURPLE,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
