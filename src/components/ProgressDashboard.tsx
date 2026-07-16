/**
 * Dashboard tiến trình trên TRANG CHỦ bệnh nhân — gọi GET /patients/me/progress-dashboard,
 * hiển thị 3 phần:
 *   3a. Biểu đồ đường điểm 7 ngày (daily_scores) — TỰ VẼ bằng View thuần (chấm + đoạn
 *       thẳng xoay bằng transform), KHÔNG cài thư viện chart: nhẹ nhất có thể, chạy
 *       y hệt trên cả Expo Web lẫn native, không lo tương thích SDK.
 *   3b. Lịch tháng kiểu Google (daily_scores_30 tô xanh ngày đã luyện) + chuỗi ngày.
 *   3c. "Từ cần chú ý" — tối đa 10 từ hay sai (difficult_words).
 *
 * 3 trạng thái: đang tải (spinner) / lỗi (thông báo + nút thử lại) / rỗng (lời nhắn
 * thân thiện). KHÔNG crash khi thiếu dữ liệu.
 *
 * onLoaded: báo dữ liệu về cho màn cha (trang chủ dùng streak cho card "Chuỗi").
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getProgressDashboard } from '@/src/api/stats';
import { exerciseDisplayName } from '@/src/constants/exercises';
import { ActivityCalendar } from '@/src/components/ActivityCalendar';
import type { DailyScore, ProgressDashboard as ProgressDashboardData } from '@/src/types/api';

const GREEN = '#2E7D32';
const PURPLE = '#7C4DFF';
const GRID = '#e4e0f0';
const MUTED = '#666';

// Thứ trong tuần kiểu VN: getDay() 0=CN, 1=T2...
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function weekdayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : WEEKDAY_SHORT[d.getDay()];
}

// ── 3a. Biểu đồ đường 7 ngày (View thuần) ────────────────────────────────────

const CHART_HEIGHT = 150;

function LineChart({ days }: { days: DailyScore[] }) {
  const [width, setWidth] = useState(0);

  const n = days.length;
  const stepX = n > 1 && width > 0 ? width / (n - 1) : 0;
  const toY = (score: number) => (1 - score / 100) * CHART_HEIGHT;

  // Điểm có dữ liệu (ngày null -> bỏ điểm, đường tự "ngắt đoạn")
  const points = days.map((d, i) =>
    d.avg_score == null ? null : { x: i * stepX, y: toY(d.avg_score), score: d.avg_score },
  );

  // Đoạn nối 2 điểm LIỀN KỀ cùng có dữ liệu
  const segments: { left: number; top: number; length: number; angle: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    segments.push({
      left: (a.x + b.x) / 2 - length / 2, // đặt tại trung điểm rồi xoay quanh tâm
      top: (a.y + b.y) / 2 - 2,
      length,
      angle: Math.atan2(dy, dx),
    });
  }

  const hasAnyData = points.some((p) => p != null);

  return (
    <View>
      <View style={chartStyles.plotRow}>
        {/* Trục Y: 100/50/0 */}
        <View style={chartStyles.yAxis}>
          <Text style={chartStyles.yLabel}>100</Text>
          <Text style={chartStyles.yLabel}>50</Text>
          <Text style={chartStyles.yLabel}>0</Text>
        </View>

        <View
          style={chartStyles.plot}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {/* Lưới ngang 0/50/100 */}
          {[0, 0.5, 1].map((f) => (
            <View key={f} style={[chartStyles.gridLine, { top: f * CHART_HEIGHT }]} />
          ))}

          {width > 0 &&
            segments.map((s, i) => (
              <View
                key={`seg-${i}`}
                style={[
                  chartStyles.segment,
                  {
                    left: s.left,
                    top: s.top,
                    width: s.length,
                    transform: [{ rotate: `${s.angle}rad` }],
                  },
                ]}
              />
            ))}

          {width > 0 &&
            points.map((p, i) =>
              p == null ? null : (
                <View key={`pt-${i}`}>
                  <Text
                    style={[
                      chartStyles.pointValue,
                      { left: p.x - 16, top: Math.max(p.y - 26, -4) },
                    ]}
                  >
                    {Math.round(p.score)}
                  </Text>
                  <View
                    style={[chartStyles.dot, { left: p.x - 6, top: p.y - 6 }]}
                  />
                </View>
              ),
            )}

          {!hasAnyData && (
            <View style={chartStyles.emptyOverlay}>
              <Text style={chartStyles.emptyText}>
                Chưa có điểm trong 7 ngày qua — làm bài để thấy biểu đồ nhé!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Nhãn ngày (T2..CN) */}
      <View style={chartStyles.xAxis}>
        <View style={chartStyles.yAxisSpacer} />
        {days.map((d) => (
          <Text key={d.date} style={chartStyles.xLabel}>
            {weekdayLabel(d.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  plotRow: { flexDirection: 'row', alignItems: 'stretch' },
  yAxis: {
    width: 34,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  yLabel: { fontSize: 12, color: MUTED },
  plot: { flex: 1, height: CHART_HEIGHT, marginVertical: 0 },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GRID,
  },
  segment: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: GREEN,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: GREEN,
  },
  pointValue: {
    position: 'absolute',
    width: 32,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    color: GREEN,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  emptyText: { fontSize: 15, color: MUTED, textAlign: 'center' },
  xAxis: { flexDirection: 'row', marginTop: 6 },
  yAxisSpacer: { width: 34 },
  xLabel: { flex: 1, textAlign: 'center', fontSize: 13, color: '#333' },
});

// ── Component chính ──────────────────────────────────────────────────────────

export function ProgressDashboard({
  onLoaded,
}: {
  onLoaded?: (data: ProgressDashboardData) => void;
}) {
  const [data, setData] = useState<ProgressDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getProgressDashboard()
      .then((d) => {
        setData(d);
        onLoaded?.(d);
      })
      .catch(() => setError('Không tải được tiến trình. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
    // onLoaded cố ý KHÔNG nằm trong deps: chỉ tải lại khi bấm "Thử lại"/mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [load]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.muted}>Đang tải tiến trình...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.error}>{error ?? 'Không có dữ liệu.'}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* 3a. Biểu đồ điểm 7 ngày */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Điểm 7 ngày gần nhất</Text>
        <LineChart days={data.daily_scores} />
      </View>

      {/* 3b. Lịch tháng luyện tập (kiểu Google, tô xanh ngày đã luyện) */}
      <View style={styles.card}>
        <ActivityCalendar
          dailyScores={data.daily_scores_30}
          activeDaysLast30={data.streak.active_days_last_30}
        />
      </View>

      {/* Chuỗi (dưới lịch) */}
      <View style={styles.card}>
        <View style={styles.streakRow}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakText}>
            Chuỗi hiện tại:{' '}
            <Text style={styles.streakNumber}>{data.streak.current_streak_days} ngày</Text>
          </Text>
        </View>
      </View>

      {/* 3c. Từ cần chú ý */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Từ cần chú ý</Text>
        {data.difficult_words.length === 0 ? (
          <Text style={styles.muted}>
            Chưa có đủ dữ liệu — hãy luyện tập thêm nhé 💪
          </Text>
        ) : (
          data.difficult_words.map((w) => (
            <View key={`${w.word}-${w.exercise_type}`} style={styles.wordRow}>
              <Text style={styles.wordText}>{w.word}</Text>
              <View style={styles.wordRight}>
                <Text style={styles.wordFail}>
                  {w.fail_count}/{w.attempts} lần chưa đạt
                </Text>
                <Text style={styles.wordType}>{exerciseDisplayName(w.exercise_type)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  centerBox: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  muted: { fontSize: 15, color: MUTED },
  error: { fontSize: 15, color: '#D64545', textAlign: 'center' },
  retryBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#faf9fd',
    borderWidth: 1,
    borderColor: '#eceaf4',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  cardSub: { fontSize: 14, color: MUTED },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakFlame: { fontSize: 30 },
  streakText: { fontSize: 18, color: '#222' },
  streakNumber: { fontSize: 22, fontWeight: 'bold', color: '#E8912D' },
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee7fb',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  wordText: { fontSize: 18, fontWeight: '600', color: '#222', flexShrink: 1 },
  wordRight: { alignItems: 'flex-end', gap: 2 },
  wordFail: { fontSize: 14, color: '#D64545', fontWeight: '600' },
  wordType: { fontSize: 13, color: PURPLE },
});
