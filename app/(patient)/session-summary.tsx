/**
 * MÀN TỔNG KẾT PHIÊN (rule.md mục 3) — đích đến khi hết 10 bài HOẶC bấm "Dừng phiên".
 *
 * Vào màn: POST /sessions/{sid}/finish -> nhận trạng thái cuối (completed | stopped_early,
 * completed_count, total_retry_count, duration_seconds). Nếu phiên ĐÃ kết thúc từ trước
 * (409 — vd F5 lại màn này) -> GET /sessions/{sid} lấy trạng thái đã chốt.
 * => Số liệu 100% TỪ BACKEND (nguồn sự thật), không tự đếm local.
 *
 * Điểm TB phiên: backend không trả -> tính từ ?scores= (điểm các bài tích lũy trong URL
 * suốt luồng làm bài). F5 giữa chừng làm mất scores -> hiện "—" (chỉ mất số hiển thị phụ,
 * không mất phiên/tiến độ).
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';

import { finishSession, getSession } from '@/src/api/sessions';
import type { SessionState } from '@/src/types/api';

const GREEN = '#2E7D32';
const ORANGE = '#E8912D';

function fmtDuration(sec: number | null): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

export default function SessionSummaryScreen() {
  const router = useRouter();
  const { sid, scores } = useLocalSearchParams<{ sid?: string; scores?: string }>();

  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Điểm TB phiên từ scores tích lũy trong URL (backend không trả điểm TB).
  const scoreList = (scores ?? '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  const avgScore =
    scoreList.length > 0
      ? Math.round(scoreList.reduce((a, b) => a + b, 0) / scoreList.length)
      : null;

  useEffect(() => {
    if (!sid) return;
    let active = true;
    (async () => {
      try {
        const s = await finishSession(sid);
        if (active) setState(s);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          // Phiên đã kết thúc trước đó (F5 màn này) -> đọc trạng thái đã chốt
          try {
            const s = await getSession(sid);
            if (active) setState(s);
          } catch {
            if (active) setError('Không tải được kết quả phiên.');
          }
        } else if (active) {
          setError('Không tải được kết quả phiên.');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [sid]);

  if (!sid) {
    router.replace('/(patient)/home');
    return null;
  }

  const completedFull = state?.status === 'completed';

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {!state && !error ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.muted}>Đang tổng kết phiên...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : state ? (
        <>
          <Text style={styles.heroIcon}>{completedFull ? '🎉' : '💪'}</Text>
          <Text style={styles.heroTitle}>
            {completedFull ? 'Hoàn thành phiên tập!' : 'Đã dừng phiên'}
          </Text>
          <Text style={[styles.statusPill, completedFull ? styles.pillDone : styles.pillEarly]}>
            {completedFull ? 'Hoàn thành đủ bài' : 'Dừng sớm — không sao, cố lần sau!'}
          </Text>

          <View style={styles.card}>
            <SummaryRow
              label="Số bài hoàn thành"
              value={`${state.completed_count}/${state.planned_count}`}
            />
            <SummaryRow
              label="Điểm trung bình phiên"
              value={avgScore != null ? `${avgScore} điểm` : '—'}
            />
            <SummaryRow label="Số lần làm lại" value={String(state.total_retry_count)} />
            <SummaryRow label="Thời lượng" value={fmtDuration(state.duration_seconds)} />
          </View>

          <Pressable
            style={styles.homeBtn}
            onPress={() => router.replace('/(patient)/home')}
          >
            <Text style={styles.homeBtnText}>🏠 Về trang chủ</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, padding: 24, gap: 14, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 10 },
  muted: { fontSize: 15, color: '#666' },
  error: { fontSize: 15, color: '#D64545', textAlign: 'center' },

  heroIcon: { fontSize: 64 },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: '#222', textAlign: 'center' },
  statusPill: {
    fontSize: 15,
    fontWeight: '600',
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  pillDone: { backgroundColor: '#E7F5E9', color: GREEN },
  pillEarly: { backgroundColor: '#FFF4E5', color: ORANGE },

  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#faf9fd',
    borderWidth: 1,
    borderColor: '#eceaf4',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    marginTop: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 15, color: '#555' },
  rowValue: { fontSize: 17, fontWeight: 'bold', color: '#222' },

  homeBtn: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 10,
    borderBottomWidth: 5,
    borderBottomColor: '#1B5E3A',
  },
  homeBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
