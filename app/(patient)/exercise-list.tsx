/**
 * Bước 3/3 luồng chọn bài — "Danh sách bài" theo (dạng bài + chủ đề).
 *
 * Nhận param type + topic. Gọi getAssignments(type, topic):
 *   - type cụ thể   : list sắp theo order_index.
 *   - type="mixed"  : backend đã TRỘN sẵn (ổn định trong ngày) — mỗi bài hiện kèm
 *                     nhãn dạng bài (Gọi tên/Nghe và đoán/Hoàn thành câu) để bệnh nhân
 *                     biết sắp làm dạng gì.
 * Bấm 1 bài -> exercise-detail (màn làm bài đã có) với assignment_id + type/topic để
 * nút "Bài tiếp theo" đi đúng danh sách này.
 *
 * Trạng thái pending/completed tải lại mỗi lần màn focus (làm xong 1 bài quay lại
 * là thấy "Đã xong").
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getAssignments } from '@/src/api/assignments';
import { BottomNav } from '@/src/components/BottomNav';
import { exerciseDisplayName, topicDisplayName } from '@/src/constants/exercises';
import type { PlanAssignment } from '@/src/types/api';

const GREEN = '#2E7D32';
const PURPLE = '#7C4DFF';

export default function ExerciseListScreen() {
  const router = useRouter();
  const { type, topic } = useLocalSearchParams<{ type?: string; topic?: string }>();
  const exerciseType = type ?? 'mixed';
  const topicValue = topic ?? '';
  const isMixed = exerciseType === 'mixed';
  const typeLabel = isMixed ? 'Trộn cả 3 dạng' : exerciseDisplayName(exerciseType);

  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      getAssignments(exerciseType, topicValue || undefined)
        .then((list) => active && setAssignments(list))
        .catch(() => active && setError('Không tải được danh sách bài. Vui lòng thử lại.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [exerciseType, topicValue]),
  );

  const doneCount = assignments.filter((a) => a.status === 'completed').length;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>{topicDisplayName(topicValue)}</Text>
        <Text style={styles.subtitle}>
          Bước 3/3 — <Text style={styles.typeLabel}>{typeLabel}</Text>
          {assignments.length > 0 ? ` · Đã xong ${doneCount}/${assignments.length}` : ''}
        </Text>
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
            <Text style={styles.muted}>Chưa có bài nào trong chủ đề này.</Text>
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
                      )}&type=${exerciseType}&topic=${topicValue}&index=${i}`,
                    )
                  }
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.num, done && styles.numDone]}>
                      <Text style={[styles.numText, done && styles.numTextDone]}>
                        {i + 1}
                      </Text>
                    </View>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowLabel}>Bài {i + 1}</Text>
                      {/* mixed: nhãn dạng bài để biết sắp làm dạng gì */}
                      {isMixed && (
                        <Text style={styles.rowTypeTag}>
                          {exerciseDisplayName(a.exercise_type)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text
                    style={[styles.status, done ? styles.statusDone : styles.statusPending]}
                  >
                    {done ? 'Đã xong ✓' : 'Chưa làm'}
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
  header: { padding: 20, gap: 6 },
  back: { fontSize: 16, color: GREEN, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: 'bold', marginTop: 6 },
  subtitle: { fontSize: 16, color: '#555' },
  typeLabel: { color: PURPLE, fontWeight: 'bold' },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numDone: { backgroundColor: GREEN, borderColor: GREEN },
  numText: { color: PURPLE, fontWeight: 'bold', fontSize: 16 },
  numTextDone: { color: '#fff' },
  rowTextWrap: { gap: 2, flexShrink: 1 },
  rowLabel: { fontSize: 18, fontWeight: '600' },
  rowTypeTag: { fontSize: 14, color: PURPLE, fontWeight: '600' },
  status: { fontSize: 14, fontWeight: '600' },
  statusDone: { color: GREEN },
  statusPending: { color: '#999' },
});
