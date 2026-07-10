/**
 * Trang chủ bệnh nhân (bản MỚI — luồng chọn bài 3 bước + dashboard tiến trình).
 *
 * GIỮ NGUYÊN so với bản cũ: header "Chào, {tên}", card "Điểm trung bình tuần này",
 * phần "Thống kê" (Chuỗi / Mục tiêu tuần — nay lấy SỐ THẬT từ progress-dashboard:
 * Chuỗi = current_streak_days, Mục tiêu tuần = số ngày có luyện tập trong 7 ngày qua).
 *
 * BỎ: danh sách 3 nhóm bài liệt kê trực tiếp.
 * THÊM:
 *   - Nút lớn "Bắt đầu bài tập hôm nay" -> /(patient)/select-type (chọn dạng bài).
 *   - "Tiến trình của bạn" = <ProgressDashboard/> (biểu đồ 7 ngày / chuỗi + lịch /
 *     từ cần chú ý) ngay dưới nút.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMyStats } from '@/src/api/stats';
import { BottomNav } from '@/src/components/BottomNav';
import { ProgressDashboard } from '@/src/components/ProgressDashboard';
import { useAuth } from '@/src/context/AuthContext';
import type {
  PatientStatsResponse,
  ProgressDashboard as ProgressDashboardData,
} from '@/src/types/api';

const GREEN = '#2E7D32';
const PURPLE = '#7C4DFF';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState<PatientStatsResponse | null>(null);
  // Dashboard tự tải trong <ProgressDashboard/>; trang chủ nhận lại data qua onLoaded
  // để điền 2 card "Thống kê" (không gọi API 2 lần).
  const [dash, setDash] = useState<ProgressDashboardData | null>(null);

  useEffect(() => {
    let active = true;
    getMyStats()
      .then((s) => active && setStats(s))
      .catch(() => {
        /* stats lỗi -> card hiện "—", không chặn trang chủ */
      });
    return () => {
      active = false;
    };
  }, []);

  const acc = stats?.accuracy_score;
  const avgText = acc != null ? `${acc}` : '—';

  const streakDays = dash?.streak.current_streak_days;
  // "Mục tiêu tuần": số ngày CÓ LUYỆN TẬP trong 7 ngày gần nhất (đếm từ daily_scores).
  const activeThisWeek = dash
    ? dash.daily_scores.filter((d) => d.session_count > 0).length
    : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Chào, {user?.full_name ?? 'bạn'}</Text>
            <Text style={styles.subGreeting}>Chúc bạn một ngày tốt lành</Text>
          </View>
          <Text style={styles.bell}>🔔</Text>
        </View>

        {/* Card điểm trung bình */}
        <View style={styles.avgCard}>
          <Text style={styles.avgLabel}>Điểm trung bình tuần này</Text>
          <Text style={styles.avgValue}>
            {avgText}
            <Text style={styles.avgMax}>/100</Text>
          </Text>
        </View>

        {/* Thống kê (số thật từ dashboard; đang tải -> "—") */}
        <Text style={styles.section}>Thống kê</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#E7F5E9' }]}>
            <Text style={styles.statTitle}>Chuỗi</Text>
            <Text style={styles.statValue}>
              {streakDays != null ? `${streakDays} Ngày` : '—'}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EFE8FF' }]}>
            <Text style={styles.statTitle}>Mục tiêu tuần</Text>
            <Text style={[styles.statValue, { color: PURPLE }]}>
              {activeThisWeek != null ? `${activeThisWeek}/7 Buổi` : '—'}
            </Text>
          </View>
        </View>

        {/* Nút lớn bắt đầu luồng chọn bài: dạng bài -> chủ đề -> danh sách bài */}
        <Pressable
          style={styles.startBtn}
          onPress={() => router.push('/(patient)/select-type')}
        >
          <Text style={styles.startBtnIcon}>🎯</Text>
          <Text style={styles.startBtnText}>Bắt đầu bài tập hôm nay</Text>
        </Pressable>

        {/* Học từ vựng (flashcard 90 từ) — cùng phong cách khối nổi, màu tím để phân biệt */}
        <Pressable
          style={[styles.startBtn, styles.flashcardBtn]}
          onPress={() => router.push('/(patient)/flashcards')}
        >
          <Text style={styles.startBtnIcon}>📚</Text>
          <Text style={styles.startBtnText}>Học từ vựng</Text>
        </Pressable>

        {/* Dashboard tiến trình */}
        <Text style={styles.section}>Tiến trình của bạn</Text>
        <ProgressDashboard onLoaded={setDash} />
      </ScrollView>

      {/* Bottom nav (đã bỏ "Tiến trình" — dashboard nằm ngay trang chủ) */}
      <BottomNav active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, gap: 12, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: GREEN },
  subGreeting: { fontSize: 15, color: '#4a4a4a' },
  bell: { fontSize: 26 },
  avgCard: { backgroundColor: PURPLE, borderRadius: 16, padding: 20, marginVertical: 8 },
  avgLabel: { color: '#fff', fontSize: 16 },
  avgValue: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 4 },
  avgMax: { color: '#e0d4ff', fontSize: 28, fontWeight: 'bold' },
  section: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 16, gap: 6 },
  statTitle: { fontSize: 15, color: '#333' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: GREEN },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 20,
    marginTop: 10,
    // Cạnh dưới đậm hơn tạo khối nổi (đồng bộ nút landing)
    borderBottomWidth: 5,
    borderBottomColor: '#1B5E3A',
  },
  startBtnIcon: { fontSize: 24 },
  startBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  // Nút "Học từ vựng": cùng khối nổi với startBtn, đổi màu tím
  flashcardBtn: { backgroundColor: PURPLE, borderBottomColor: '#5C35CC' },
});
