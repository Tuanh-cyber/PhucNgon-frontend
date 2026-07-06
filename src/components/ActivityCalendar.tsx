/**
 * Lịch tháng luyện tập — heat-map theo cường độ hàng ngày (minimal, gọn gàng, 30 ngày đầy đủ).
 *
 * Hiển thị:
 *   - Tháng hiện tại + tháng trước (để lịch trông đầy) — tương tự ảnh tham khảo.
 *   - Cột: T2 → CN (kiểu Việt Nam, KHÔNG dùng Sun-Sat).
 *   - Heat-map: session_count từ daily_scores_30 (30 ngày, đồng nhất gradient) + gray cho > 30 ngày.
 *     Gradient: 0 bài=trắng nhạt, 1=nhạt, 2=trung, 3+=đậm.
 *   - Ô HÔM NAY: khung nổi bật.
 *   - KHÔNG tóm tắt, legend tối giản → gọn gàng như ảnh.
 */

import { StyleSheet, Text, View } from 'react-native';

import type { DailyScore } from '@/src/types/api';

const GREEN = '#2E7D32';
const WEEKDAY_LABEL = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Suy màu từ session_count (NGUỒN DUYỀN NHẤT: daily_scores_30, 30 ngày gần nhất). */
function getHeatColor(sessionCount: number | null, isOldData: boolean): string {
  if (isOldData || sessionCount == null) return '#f5f5f5';  // > 30 ngày hoặc null: xám
  // Cho 30 ô gần nhất: session_count luôn có (từ daily_scores_30)
  if (sessionCount === 0) return '#f1eff8';                 // 0 bài: trắng nhạt
  if (sessionCount === 1) return '#d4edda';                 // 1 bài: nhạt
  if (sessionCount === 2) return '#a8dfd1';                 // 2 bài: trung
  return GREEN;                                              // 3+ bài: xanh đậm
}

interface DayCell {
  iso: string;
  dayOfMonth: number;
  weekdayIndex: number; // 0=T2, 6=CN
  sessionCount: number | null; // từ daily_scores_30 (30 ngày, null cho > 30 ngày)
  isOldData: boolean; // > 30 ngày (tô gray)
  isToday: boolean;
}

export function ActivityCalendar({
  dailyScores,
  activeDaysLast30,
}: {
  dailyScores: DailyScore[]; // 30 phần tử (daily_scores_30) — nguồn duy nhất tô màu
  activeDaysLast30?: string[]; // Không dùng (giữ lại prop để backward compat)
}) {
  const today = new Date();
  const dailyScoresMap = new Map(dailyScores.map((d) => [d.date, d.session_count]));

  // Tạo lịch tháng hiện tại + tháng trước (tương tự ảnh tham khảo)
  const cells: DayCell[] = [];

  // Lấy ngày đầu tiên của tháng hiện tại
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  // Lấy ngày đầu tiên của tháng trước
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  // Bắt đầu từ ngày đầu tiên (có thể thuộc tháng trước) sao cho trùng với T2
  const firstCell = new Date(prevMonthStart);
  firstCell.setDate(prevMonthStart.getDate() - ((prevMonthStart.getDay() + 6) % 7));

  // Tạo 42 ô (6 tuần)
  for (let i = 0; i < 42; i++) {
    const d = new Date(firstCell);
    d.setDate(firstCell.getDate() + i);

    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    const dayOfMonth = d.getDate();
    const weekdayIndex = (d.getDay() + 6) % 7; // JS: 0=CN; chuyển: 0=T2, 6=CN
    const sessionCount = dailyScoresMap.get(iso) ?? null;
    const isOldData = (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24) > 30;
    const isToday = iso === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    cells.push({
      iso,
      dayOfMonth,
      weekdayIndex,
      sessionCount,
      isOldData,
      isToday,
    });
  }

  // Xếp theo tuần: theo cột thứ
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.wrap}>
      {/* Hàng nhãn thứ */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABEL.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* Lưới tuần */}
      <View style={styles.grid}>
        {weeks.map((week, weekIdx) => (
          <View key={weekIdx} style={styles.week}>
            {week.map((cell) => {
              const bgColor = getHeatColor(cell.sessionCount, cell.isOldData);

              return (
                <View
                  key={cell.iso}
                  style={[
                    styles.cell,
                    { backgroundColor: bgColor },
                    cell.isToday && styles.cellToday,
                  ]}
                >
                  <Text style={styles.cellText}>{cell.dayOfMonth}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Minimal legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#f1eff8' }]} />
          <Text style={styles.legendText}>Không</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#d4edda' }]} />
          <Text style={styles.legendText}>1 bài</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#a8dfd1' }]} />
          <Text style={styles.legendText}>2 bài</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: GREEN }]} />
          <Text style={styles.legendText}>3+ bài</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },

  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  grid: { gap: 2 },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 },

  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cellToday: {
    borderWidth: 3,
    borderColor: '#333',
  },
  cellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});
