/**
 * Bước 2/3 luồng chọn bài — "Chọn chủ đề".
 *
 * Nhận param type (naming/command_identification/sentence_building/mixed).
 * Gọi getTopics(type) -> list topic THẬT SỰ có bài (topic_display + tiến độ đã làm/tổng).
 *
 * 2 chế độ theo cờ ?session=1:
 *   - LUỒNG CŨ (không cờ): bấm topic -> /(patient)/exercise-list?type&topic (y nguyên).
 *   - LUỒNG PHIÊN (rule.md): thêm card "🎲 Trộn chủ đề" (Mixed Topics = không truyền
 *     topic); chọn xong -> POST /sessions/start -> nhận session_id + 10 bài -> vào màn
 *     làm bài của phiên (exercise-detail?sid=...&ids=... — ids = 10 assignment theo thứ tự).
 *
 * Tiến độ tải lại mỗi lần màn được focus (làm xong bài quay về thấy số mới).
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

import { getTopics } from '@/src/api/plans';
import { startSession } from '@/src/api/sessions';
import { BottomNav } from '@/src/components/BottomNav';
import { TOPIC_ICON, exerciseDisplayName } from '@/src/constants/exercises';
import type { SessionMode, TopicSummary } from '@/src/types/api';

const GREEN = '#2E7D32';
const PURPLE = '#7C4DFF';

export default function SelectTopicScreen() {
  const router = useRouter();
  const { type, session } = useLocalSearchParams<{ type?: string; session?: string }>();
  const exerciseType = type ?? 'mixed';
  const isSessionFlow = session === '1';
  const typeLabel =
    exerciseType === 'mixed' ? 'Trộn cả 3 dạng' : exerciseDisplayName(exerciseType);

  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false); // đang POST /sessions/start

  /** LUỒNG PHIÊN: chọn topic (null = Mixed Topics) -> start phiên -> vào bài đầu tiên. */
  async function onPickForSession(topic: string | null) {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const s = await startSession(exerciseType as SessionMode, topic ?? undefined);
      if (s.exercises.length === 0) {
        setError('Không có bài nào cho lựa chọn này.');
        return;
      }
      const ids = s.exercises.map((e) => e.assignment_id).join(',');
      // replace (không push): back từ màn làm bài không quay lại màn chọn topic nữa.
      router.replace(
        `/(patient)/exercise-detail?assignmentId=${encodeURIComponent(
          s.exercises[0].assignment_id,
        )}&sid=${s.session_id}&ids=${ids}&index=0&type=${exerciseType}${
          topic ? `&topic=${topic}` : ''
        }`,
      );
    } catch {
      setError('Không bắt đầu được phiên tập. Vui lòng thử lại.');
    } finally {
      setStarting(false);
    }
  }

  // Tải lại khi màn được focus (quay về từ bài tập -> tiến độ cập nhật)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      getTopics(exerciseType)
        .then((list) => active && setTopics(list))
        .catch(() => active && setError('Không tải được danh sách chủ đề. Vui lòng thử lại.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [exerciseType]),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Chọn chủ đề</Text>
        <Text style={styles.subtitle}>
          Bước 2/3 — Dạng bài: <Text style={styles.typeLabel}>{typeLabel}</Text>
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
          {/* LUỒNG PHIÊN: card Mixed Topics (rule.md — trộn mọi chủ đề, không truyền topic) */}
          {isSessionFlow && topics.length > 0 ? (
            <Pressable
              style={[styles.row, styles.rowMixed, starting && styles.rowDisabled]}
              onPress={() => onPickForSession(null)}
              disabled={starting}
            >
              <Text style={styles.rowIcon}>🎲</Text>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Trộn chủ đề</Text>
                <Text style={styles.rowProgress}>Ngẫu nhiên từ mọi chủ đề</Text>
              </View>
              {starting ? <ActivityIndicator color={PURPLE} /> : <Text style={styles.chevron}>›</Text>}
            </Pressable>
          ) : null}
          {topics.length === 0 ? (
            <Text style={styles.muted}>Chưa có chủ đề nào có bài thuộc dạng này.</Text>
          ) : (
            topics.map((t) => {
              const allDone = t.completed_count >= t.total_count;
              return (
                <Pressable
                  key={t.topic}
                  style={[styles.row, starting && styles.rowDisabled]}
                  disabled={starting}
                  onPress={() =>
                    isSessionFlow
                      ? onPickForSession(t.topic)
                      : router.push(
                          `/(patient)/exercise-list?type=${exerciseType}&topic=${t.topic}`,
                        )
                  }
                >
                  <Text style={styles.rowIcon}>{TOPIC_ICON[t.topic] ?? '📚'}</Text>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>{t.topic_display}</Text>
                    <Text style={[styles.rowProgress, allDone && styles.rowProgressDone]}>
                      Đã làm {t.completed_count}/{t.total_count} bài
                      {allDone ? ' ✓' : ''}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
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
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F3EEFF',
    borderRadius: 16,
    padding: 18,
    borderBottomWidth: 4,
    borderBottomColor: '#ddd2f5',
  },
  // Card "Trộn chủ đề" (Mixed Topics) — viền tím đậm nổi bật, đứng đầu danh sách
  rowMixed: { borderWidth: 2, borderColor: PURPLE, backgroundColor: '#EFE8FF' },
  rowDisabled: { opacity: 0.5 },
  rowIcon: { fontSize: 30 },
  rowTextWrap: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  rowProgress: { fontSize: 15, color: '#666' },
  rowProgressDone: { color: GREEN, fontWeight: '600' },
  chevron: { fontSize: 30, color: PURPLE, fontWeight: 'bold' },
});
