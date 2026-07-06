/**
 * Bước 3 đăng ký — "Bài tập đề xuất cho bạn" (THAY màn Kết quả đánh giá ban đầu cũ).
 *
 * Gọi GET /patients/me/recommended-exercises: 3 loại bài + trọng số theo profile bệnh
 * (aphasia_type -> broca_like/wernicke_like/mixed, bảng rule.md).
 * Hiển thị: loại recommended=true nổi bật (viền xanh + nhãn "Đề xuất"), weight thấp mờ dần.
 * Chỉ là GỢI Ý hiển thị — plan thật vẫn đủ 10 bài/loại; bác sĩ có thể điều chỉnh sau.
 *
 * Nút "Bắt đầu luyện tập" -> /(patient)/home.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getRecommendedExercises } from '@/src/api/assessment';
import { EXERCISE_ICON } from '@/src/constants/exercises';
import type { RecommendedExercise } from '@/src/types/api';

const GREEN = '#2E7D32';

export default function RecommendedExercisesScreen() {
  const router = useRouter();

  const [items, setItems] = useState<RecommendedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRecommendedExercises()
      .then((res) => active && setItems(res))
      .catch(() => active && setError('Không tải được gợi ý bài tập. Vui lòng thử lại.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bài tập đề xuất cho bạn</Text>
      <StepBar current={3} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.muted}>Đang tải...</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        items.map((it) => {
          // recommended -> nổi bật; weight 0 -> mờ hẳn (vẫn hiện: mọi loại đều được làm).
          const dim = it.recommended ? 1 : it.weight > 0 ? 0.65 : 0.4;
          return (
            <View
              key={it.exercise_type}
              style={[styles.card, it.recommended && styles.cardRecommended, { opacity: dim }]}
            >
              <Text style={styles.cardIcon}>{EXERCISE_ICON[it.exercise_type] ?? '📝'}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{it.display_name}</Text>
                <Text style={styles.cardWeight}>
                  Mức ưu tiên: {Math.round(it.weight * 100)}%
                </Text>
              </View>
              {it.recommended ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Đề xuất</Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <Text style={styles.note}>Gợi ý dựa trên loại bệnh — bác sĩ có thể điều chỉnh.</Text>

      <Pressable style={styles.button} onPress={() => router.replace('/(patient)/home')}>
        <Text style={styles.buttonText}>Bắt đầu luyện tập</Text>
      </Pressable>
    </ScrollView>
  );
}

/** Thanh bước 1-2-3 (đây là bước 3 — bước cuối luồng đăng ký). */
function StepBar({ current }: { current: number }) {
  return (
    <View style={styles.stepBar}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={styles.stepItem}>
          <View style={[styles.stepDot, n === current && styles.stepDotActive]}>
            <Text style={[styles.stepNum, n === current && styles.stepNumActive]}>{n}</Text>
          </View>
          {n < 3 ? <View style={styles.stepLine} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 14 },
  center: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  muted: { fontSize: 15, color: '#666' },
  error: { color: '#D64545', fontSize: 15 },
  title: { fontSize: 24, fontWeight: 'bold' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 16,
    padding: 16,
  },
  cardRecommended: { borderColor: GREEN, backgroundColor: '#E7F5E9' },
  cardIcon: { fontSize: 34 },
  cardBody: { flex: 1, gap: 2 },
  cardName: { fontSize: 18, fontWeight: 'bold' },
  cardWeight: { fontSize: 14, color: '#555' },
  badge: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  note: { fontSize: 13, color: '#888', fontStyle: 'italic' },
  button: {
    backgroundColor: GREEN,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  stepBar: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: GREEN },
  stepNum: { color: GREEN, fontWeight: 'bold' },
  stepNumActive: { color: '#fff' },
  stepLine: { width: 28, height: 1, backgroundColor: GREEN },
});
