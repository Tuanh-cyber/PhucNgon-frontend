/**
 * Màn "Chi tiết bệnh nhân" web bác sĩ (mockup Ảnh 2) — GET /therapist/patients/{id}.
 *
 * - Header: avatar initials + tên + hàng meta (tuổi · aphasia · mức độ · bệnh viện · bác sĩ).
 * - Box insight: vàng nếu type=="warn", xanh nếu "ok" (text rule-based từ backend).
 * - 4 thẻ: Điểm TB/ngày, Buổi tập/tuần (x/7), Chuỗi, Điểm tăng (delta vs tuần trước; null -> "—").
 * - "Biểu đồ 7 ngày gần nhất": cột theo dashboard.daily_scores (avg_score 0-100).
 * - "Phân tích thành phần": 3 thanh Độ chính xác / Hoàn thành / Độ trôi chảy từ stats.
 * - Tabs: Tổng quan (nội dung) / Tiến trình / Bài tập / Ghi chú / Báo cáo (stub "Sắp có").
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPatientDetail } from '@/src/api/therapist';
import type { TherapistPatientDetail } from '@/src/types/api';

const GREEN = '#2E7D32';
const PURPLE = '#7C4DFF';
const TABS = ['Tổng quan', 'Tiến trình', 'Bài tập', 'Ghi chú', 'Báo cáo'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name[0] ?? '?').toUpperCase();
}

export default function DoctorPatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<TherapistPatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPatientDetail(id)
      .then(setData)
      .catch(() => setError('Không tải được hồ sơ bệnh nhân (không tồn tại hoặc không thuộc bạn).'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Không có dữ liệu.'}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const { patient, dashboard, stats, insight } = data;
  const warn = insight.type === 'warn';

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Pressable onPress={() => router.back()} hitSlop={10}>
        <Text style={styles.backLink}>‹ Quay lại danh sách</Text>
      </Pressable>

      {/* ── Header hồ sơ ── */}
      <View style={styles.headerCard}>
        <View style={styles.avatarBig}>
          <Text style={styles.avatarBigText}>{initials(patient.full_name)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.patientName}>{patient.full_name}</Text>
          <Text style={styles.metaRow}>
            {patient.age} tuổi
            {patient.aphasia_type ? ` · ${patient.aphasia_type}` : ''}
            {patient.severity_level ? ` · Mức độ: ${patient.severity_level}` : ''}
            {patient.hospital_name ? ` · ${patient.hospital_name}` : ''}
            {` · BS phụ trách: ${patient.doctor_name}`}
          </Text>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <Pressable key={t} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab !== 0 ? (
        <View style={styles.stub}>
          <Text style={styles.stubText}>🚧 Mục “{TABS[tab]}” sắp có.</Text>
        </View>
      ) : (
        <>
          {/* ── Insight ── */}
          <View style={[styles.insight, warn ? styles.insightWarn : styles.insightOk]}>
            <Text style={[styles.insightText, warn ? styles.insightTextWarn : styles.insightTextOk]}>
              {warn ? '⚠️' : '✅'} {insight.text}
            </Text>
          </View>

          {/* ── 4 thẻ ── */}
          <View style={styles.cardsRow}>
            <MetricCard label="Điểm TB/ngày" value={data.avg_score_day != null ? String(data.avg_score_day) : '—'} color={GREEN} />
            <MetricCard label="Buổi tập/tuần" value={`${data.sessions_per_week}/7`} color="#1976D2" />
            <MetricCard label="Chuỗi" value={`🔥 ${dashboard.streak.current_streak_days} ngày`} color="#E8912D" />
            <MetricCard
              label="Điểm tăng (vs tuần trước)"
              value={
                data.score_delta_vs_last_week != null
                  ? `${data.score_delta_vs_last_week > 0 ? '+' : ''}${data.score_delta_vs_last_week}`
                  : '—'
              }
              color={PURPLE}
            />
          </View>

          {/* ── Biểu đồ 7 ngày ── */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Biểu đồ 7 ngày gần nhất</Text>
            <View style={styles.chart}>
              {dashboard.daily_scores.map((d) => {
                const v = d.avg_score;
                return (
                  <View key={d.date} style={styles.chartCol}>
                    <Text style={styles.chartValue}>{v != null ? Math.round(v) : ''}</Text>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          { height: `${v != null ? Math.max(v, 4) : 0}%` },
                          v == null && styles.chartBarEmpty,
                        ]}
                      />
                    </View>
                    <Text style={styles.chartLabel}>{d.date.slice(8)}/{d.date.slice(5, 7)}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Phân tích thành phần ── */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Phân tích thành phần</Text>
            <StatBar label="Độ chính xác" value={stats.accuracy_score} color={GREEN} />
            <StatBar label="Hoàn thành" value={stats.completion_score} color={PURPLE} />
            <StatBar label="Độ trôi chảy" value={stats.fluency_score} color="#E8912D" />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

/** 1 thanh phần trăm: null -> "Chưa có dữ liệu". */
function StatBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${value ?? 0}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statValue}>{value != null ? `${Math.round(value)}%` : 'Chưa có dữ liệu'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  error: { color: '#D64545', fontSize: 15, textAlign: 'center' },
  backBtn: { borderWidth: 1.5, borderColor: GREEN, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18 },
  backBtnText: { color: GREEN, fontWeight: '600' },
  backLink: { color: GREEN, fontSize: 15, fontWeight: '600' },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e9e5',
    padding: 18,
  },
  avatarBig: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBigText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerInfo: { flex: 1, gap: 4 },
  patientName: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  metaRow: { fontSize: 14, color: '#666' },

  tabs: { flexDirection: 'row', gap: 4, borderBottomWidth: 1, borderBottomColor: '#e0e4e0', flexWrap: 'wrap' },
  tab: { paddingVertical: 10, paddingHorizontal: 16 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: GREEN },
  tabText: { fontSize: 15, color: '#777', fontWeight: '600' },
  tabTextActive: { color: GREEN },
  stub: { padding: 40, alignItems: 'center' },
  stubText: { fontSize: 16, color: '#888' },

  insight: { borderRadius: 12, borderWidth: 1, padding: 14 },
  insightWarn: { backgroundColor: '#FFF7E0', borderColor: '#F0D48A' },
  insightOk: { backgroundColor: '#E7F5E9', borderColor: '#bfe3c6' },
  insightText: { fontSize: 15, fontWeight: '600' },
  insightTextWarn: { color: '#7a5c00' },
  insightTextOk: { color: GREEN },

  cardsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  card: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e9e5',
    padding: 18,
    gap: 4,
    alignItems: 'center',
  },
  cardValue: { fontSize: 26, fontWeight: 'bold' },
  cardLabel: { fontSize: 13, color: '#555', textAlign: 'center' },

  panel: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e9e5', padding: 18, gap: 12 },
  panelTitle: { fontSize: 17, fontWeight: 'bold', color: '#222' },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 190, paddingTop: 8 },
  chartCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartValue: { fontSize: 12, fontWeight: 'bold', color: GREEN },
  chartBarTrack: { flex: 1, width: 26, justifyContent: 'flex-end', backgroundColor: '#f2f6f2', borderRadius: 6, overflow: 'hidden', marginTop: 2 },
  chartBar: { width: '100%', backgroundColor: GREEN, borderRadius: 6 },
  chartBarEmpty: { backgroundColor: 'transparent' },
  chartLabel: { fontSize: 11, color: '#888', marginTop: 4 },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statLabel: { width: 110, fontSize: 14, color: '#444', fontWeight: '600' },
  statTrack: { flex: 1, height: 12, backgroundColor: '#eef2ee', borderRadius: 6, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 6 },
  statValue: { width: 110, fontSize: 13, color: '#555', textAlign: 'right' },
});
