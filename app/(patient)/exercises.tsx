/**
 * Danh sách bài cụ thể theo loại (mockup "CHỌN BÀI TẬP HÔM NAY" + danh sách bài).
 *
 * Nhận query param "type" (exercise_type) từ Trang chủ / bottom-nav.
 * Gọi GET /plans/me/assignments?type=... (API THẬT — trả assignment_id thật, sắp theo
 * order_index, status pending/completed).
 * Bấm 1 bài -> /(patient)/exercise-detail?assignmentId=...&type=...&index=...
 *
 * Tên loại bài lấy từ map dùng chung src/constants/exercises.ts.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getAssignmentsByType } from '@/src/api/assignments';
import { BottomNav } from '@/src/components/BottomNav';
import { EXERCISE_DISPLAY_NAME, exerciseDisplayName } from '@/src/constants/exercises';
import type { PlanAssignment } from '@/src/types/api';

const GREEN = '#2E7D32';
const PURPLE = '#7C4DFF';

export default function ExercisesScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const exerciseType = type ?? 'naming';
  const displayName = exerciseDisplayName(exerciseType);

  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getAssignmentsByType(exerciseType)
      .then((list) => active && setAssignments(list))
      .catch(() => active && setError('Không tải được danh sách bài. Vui lòng thử lại.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [exerciseType]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Chọn bài tập: {displayName}</Text>
        {/* Chuyển nhanh giữa 3 loại bài */}
        <View style={styles.typeRow}>
          {Object.entries(EXERCISE_DISPLAY_NAME).map(([t, name]) => {
            const selected = t === exerciseType;
            return (
              <Pressable
                key={t}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
                onPress={() => {
                  if (!selected) router.replace(`/(patient)/exercises?type=${t}`);
                }}
              >
                <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.muted}>Đang tải...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {assignments.length === 0 ? (
            <Text style={styles.muted}>Chưa có bài nào thuộc loại này.</Text>
          ) : (
            assignments.map((a, i) => {
              const done = a.status === 'completed';
              return (
                <Pressable
                  key={a.assignment_id}
                  style={styles.row}
                  onPress={() =>
                    router.push(
                      `/(patient)/exercise-detail?assignmentId=${encodeURIComponent(
                        a.assignment_id,
                      )}&type=${exerciseType}&index=${i}`,
                    )
                  }
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.num, done && styles.numDone]}>
                      <Text style={[styles.numText, done && styles.numTextDone]}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={styles.rowLabel}>
                      {displayName} — Bài {i + 1}
                    </Text>
                  </View>
                  <Text
                    style={[styles.status, done ? styles.statusDone : styles.statusPending]}
                  >
                    {done ? 'Đã xong' : 'Chưa làm'}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <BottomNav active="exercises" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, gap: 10 },
  back: { fontSize: 16, color: GREEN, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold' },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeChip: {
    borderWidth: 1,
    borderColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  typeChipSelected: { backgroundColor: PURPLE },
  typeChipText: { fontSize: 13, color: PURPLE },
  typeChipTextSelected: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { fontSize: 15, color: '#666' },
  error: { color: '#D64545', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
    padding: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  num: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numDone: { backgroundColor: GREEN, borderColor: GREEN },
  numText: { color: PURPLE, fontWeight: 'bold' },
  numTextDone: { color: '#fff' },
  rowLabel: { fontSize: 16, flexShrink: 1 },
  status: { fontSize: 13, fontWeight: '600' },
  statusDone: { color: GREEN },
  statusPending: { color: '#999' },
});
