/**
 * Lịch tháng luyện tập — kiểu Google Calendar THU GỌN (thay heat-map 40 ô cũ).
 *
 * Hiển thị:
 *   - Tiêu đề "Tháng M, YYYY" + 2 mũi tên ‹ › chuyển tháng (state cục bộ).
 *   - Grid 7 cột CN → T7 (theo ảnh mẫu Google), 6 hàng tuần.
 *   - Ngày NGOÀI tháng đang xem: làm mờ, không đánh dấu.
 *   - Ngày HÔM NAY: khoanh tròn XANH ĐẬM, chữ trắng.
 *   - Ngày ĐÃ LUYỆN (session_count > 0 trong daily_scores_30): tròn nền XANH NHẠT.
 *     Ngày không luyện / không có dữ liệu (quá 30 ngày): để trắng — KHÔNG lỗi.
 *
 * Nguồn dữ liệu: daily_scores_30 (mỗi phần tử CÓ date "YYYY-MM-DD") — map theo
 * date, KHÔNG suy theo thứ tự mảng. Backend không đổi.
 *
 * MÚI GIỜ: mọi phép tính ngày dùng GIỜ ĐỊA PHƯƠNG của máy (getFullYear/getMonth/
 * getDate) — tuyệt đối KHÔNG dùng toISOString() (UTC) để tránh lệch 1 ngày.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DailyScore } from '@/src/types/api';

const GREEN = '#2E7D32';
const GREEN_LIGHT = '#C8E6C9';
// CN đứng đầu — theo ảnh mẫu Google (JS getDay(): 0=CN nên khớp trực tiếp)
const WEEKDAY_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** "YYYY-MM-DD" theo GIỜ ĐỊA PHƯƠNG (không dùng toISOString — UTC lệch ngày). */
function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function ActivityCalendar({
  dailyScores,
  activeDaysLast30,
}: {
  dailyScores: DailyScore[]; // daily_scores_30 — nguồn duy nhất để tô ngày đã luyện
  activeDaysLast30?: string[]; // Không dùng (giữ prop để backward compat)
}) {
  const todayIso = localIso(new Date());

  // Tháng đang xem (mặc định tháng hiện tại); ‹ › đổi state này.
  const [view, setView] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() }; // month: 0-11
  });

  const goMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  // Ngày ĐÃ LUYỆN: session_count > 0, map theo date. Tháng cũ không có trong
  // 30 ngày dữ liệu -> đơn giản là không có trong Set -> để trắng.
  const practiced = new Set(
    dailyScores.filter((d) => d.session_count > 0).map((d) => d.date),
  );

  // 42 ô (6 tuần), bắt đầu từ CN của tuần chứa mùng 1 tháng đang xem.
  const firstOfMonth = new Date(view.year, view.month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - firstOfMonth.getDay()); // getDay(): 0=CN -> lùi về CN

  const weeks: { iso: string; day: number; inMonth: boolean }[][] = [];
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + w * 7 + i);
      row.push({
        iso: localIso(d),
        day: d.getDate(),
        inMonth: d.getMonth() === view.month,
      });
    }
    weeks.push(row);
  }

  return (
    <View style={styles.wrap}>
      {/* Tiêu đề tháng + mũi tên chuyển tháng */}
      <View style={styles.headerRow}>
        <Text style={styles.monthTitle}>
          Tháng {view.month + 1}, {view.year}
        </Text>
        <View style={styles.arrows}>
          <Pressable hitSlop={10} onPress={() => goMonth(-1)} style={styles.arrowBtn}>
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Pressable hitSlop={10} onPress={() => goMonth(1)} style={styles.arrowBtn}>
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Hàng nhãn thứ CN → T7 */}
      <View style={styles.weekRow}>
        {WEEKDAY_LABEL.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* Lưới ngày */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((cell) => {
            const isToday = cell.iso === todayIso;
            const isPracticed = cell.inMonth && practiced.has(cell.iso);
            return (
              <View key={cell.iso} style={styles.cell}>
                <View
                  style={[
                    styles.dayCircle,
                    isPracticed && styles.dayPracticed,
                    isToday && styles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !cell.inMonth && styles.dayTextOutside,
                      isPracticed && styles.dayTextPracticed,
                      isToday && styles.dayTextToday,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {/* Chú thích tối giản */}
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: GREEN_LIGHT }]} />
        <Text style={styles.legendText}>Ngày đã luyện tập</Text>
        <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
        <Text style={styles.legendText}>Hôm nay</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  monthTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  arrows: { flexDirection: 'row', gap: 4 },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { fontSize: 22, fontWeight: 'bold', color: '#444', lineHeight: 24 },

  weekRow: { flexDirection: 'row' },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    paddingVertical: 2,
  },

  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPracticed: { backgroundColor: GREEN_LIGHT },
  dayToday: { backgroundColor: GREEN },

  dayText: { fontSize: 14, color: '#222' },
  dayTextOutside: { color: '#c4c4c4' },
  dayTextPracticed: { color: '#1B5E20', fontWeight: '600' },
  dayTextToday: { color: '#fff', fontWeight: 'bold' },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 8 },
  legendText: { fontSize: 12, color: '#666' },
});
