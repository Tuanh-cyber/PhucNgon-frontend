/**
 * ⚠️ NGOÀI LUỒNG (2026-07-05): màn này đã bị GỠ khỏi luồng đăng ký — bước 3 giờ là
 * /(patient)/recommended-exercises ("Bài tập đề xuất"). File giữ lại (không route tới)
 * để dành cho tính năng bác sĩ nhập/xem đánh giá sau này; backend Assessment giữ nguyên.
 *
 * Kết quả đánh giá ban đầu (mockup "KẾT QUẢ ĐÁNH GIÁ BAN ĐẦU").
 *
 * Gọi GET /patients/me/initial-assessment lúc mở màn (số liệu bác sĩ/người nhà nhập tay lúc
 * đăng ký). Hiển thị:
 *   - Loại bệnh / Mức độ (aphasia_type, severity_level)
 *   - "KHẢ NĂNG HIỆN TẠI": 3 thanh Độ chính xác / Hoàn thành / Độ trôi chảy. null -> "Chưa
 *     có dữ liệu" (KHÔNG hiện 0%).
 *   - "ĐỀ XUẤT LỘ TRÌNH": 3 loại bài tĩnh (Gọi tên / Lặp lại / Tạo câu) — chỉ giới thiệu.
 *   - Nút "Tiếp tục" -> /(patient)/home.
 *
 * GHI CHÚ: task có nhắc gọi thêm GET /patients/me/stats, nhưng màn này (theo mockup) chỉ hiển
 * thị số liệu bác sĩ nhập tay (initial-assessment). Số "tự tính" (stats) được dùng ở Trang chủ.
 * Nên ở đây CHỈ gọi initial-assessment để tránh fetch thừa dữ liệu không hiển thị.
 *
 * PHẠM VI: ưu tiên chức năng, chưa tinh chỉnh màu/font theo ảnh.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getInitialAssessment } from '@/src/api/assessment';
import type { InitialAssessmentResponse } from '@/src/types/api';

const GREEN = '#2E7D32';

/** 3 loại bài giới thiệu ở phần "Đề xuất lộ trình" (tĩnh, không cần API). */
const ROUTE_ITEMS = [
  { icon: '🎤', label: 'Gọi tên' },
  { icon: '🔁', label: 'Nghe và đoán' },
  { icon: '✏️', label: 'Hoàn thành câu' },
];

export default function InitialAssessmentScreen() {
  const router = useRouter();

  const [data, setData] = useState<InitialAssessmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getInitialAssessment();
        if (active) setData(res);
      } catch {
        if (active) setError('Không tải được kết quả đánh giá. Vui lòng thử lại.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.muted}>Đang tải...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Không có dữ liệu.'}</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(patient)/home')}>
          <Text style={styles.buttonText}>Về trang chủ</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Kết quả đánh giá ban đầu</Text>

      <View style={styles.headerBox}>
        <Text style={styles.headerLine}>
          Loại bệnh: <Text style={styles.headerValue}>{data.aphasia_type ?? '—'}</Text>
        </Text>
        <Text style={styles.headerLine}>
          Mức độ: <Text style={styles.headerValue}>{data.severity_level ?? '—'}</Text>
        </Text>
      </View>

      <Text style={styles.section}>KHẢ NĂNG HIỆN TẠI</Text>
      <AbilityBar label="Độ chính xác" value={data.accuracy_score} color="#2E7D32" />
      <AbilityBar label="Hoàn thành" value={data.completion_score} color="#E8912D" />
      <AbilityBar label="Độ trôi chảy" value={data.fluency_score} color="#D64545" />

      <Text style={styles.section}>ĐỀ XUẤT LỘ TRÌNH</Text>
      <View style={styles.routeRow}>
        {ROUTE_ITEMS.map((it) => (
          <View key={it.label} style={styles.routeItem}>
            <Text style={styles.routeIcon}>{it.icon}</Text>
            <Text style={styles.routeLabel}>{it.label}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.button} onPress={() => router.replace('/(patient)/home')}>
        <Text style={styles.buttonText}>Tiếp tục</Text>
      </Pressable>
    </ScrollView>
  );
}

/** 1 thanh khả năng. value=null -> "Chưa có dữ liệu" thay vì 0%. */
function AbilityBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  const hasValue = value !== null && value !== undefined;
  const pct = hasValue ? Math.max(0, Math.min(100, value as number)) : 0;
  return (
    <View style={[styles.abilityCard, { borderColor: color }]}>
      <View style={styles.abilityHeader}>
        <Text style={styles.abilityLabel}>{label}</Text>
        <Text style={[styles.abilityValue, { color }]}>
          {hasValue ? `${pct}%` : 'Chưa có dữ liệu'}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { fontSize: 15, color: '#666' },
  error: { color: '#D64545', fontSize: 16, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  headerBox: { gap: 4, marginBottom: 8 },
  headerLine: { fontSize: 16 },
  headerValue: { fontWeight: 'bold' },
  section: { fontSize: 18, fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  abilityCard: { borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 8 },
  abilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  abilityLabel: { fontSize: 16 },
  abilityValue: { fontSize: 18, fontWeight: 'bold' },
  track: { height: 10, borderRadius: 5, backgroundColor: '#eee', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  routeItem: { alignItems: 'center', gap: 6 },
  routeIcon: { fontSize: 32 },
  routeLabel: { fontSize: 15, fontWeight: '600' },
  button: {
    backgroundColor: GREEN,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
