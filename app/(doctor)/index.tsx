/**
 * Màn "Tổng quan" web bác sĩ (mockup Ảnh 1):
 *   - 4 thẻ: Tổng bệnh nhân / Đang luyện tập / Cần chú ý / Hoàn thành tuần
 *     <- GET /therapist/dashboard-summary
 *   - Banner vàng "N bệnh nhân chưa luyện tập trong 3 ngày qua" <- attention_list
 *   - Bảng bệnh nhân <- GET /therapist/me/patients (filter/search/phân trang = query params,
 *     gọi lại API mỗi lần đổi). Bấm 1 dòng -> /(doctor)/patients/{id}.
 *
 * ⚠️ Nhãn cột tiến độ là "Tiến độ chương trình" (progress_week = % TOÀN PLAN, không phải tuần).
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getDashboardSummary, getMyPatients } from '@/src/api/therapist';
import type { DashboardSummary, TherapistPatientItem } from '@/src/types/api';

const GREEN = '#2E7D32';
const YELLOW_BG = '#FFF7E0';
const YELLOW_BORDER = '#F0D48A';
const PAGE_SIZE = 10;

const SEVERITIES = ['Nhẹ', 'Trung bình', 'Nặng'];

export default function DoctorOverviewScreen() {
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [items, setItems] = useState<TherapistPatientItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter + phân trang (đổi -> gọi lại API với query params)
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<string | null>(null);
  const [status, setStatus] = useState<'good' | 'attention' | null>(null);
  const [offset, setOffset] = useState(0);

  const loadSummary = useCallback(() => {
    getDashboardSummary().then(setSummary).catch(() => undefined);
  }, []);

  const loadPatients = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyPatients({
      search: search || undefined,
      severity: severity ?? undefined,
      status: status ?? undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
      })
      .catch(() => setError('Không tải được danh sách bệnh nhân.'))
      .finally(() => setLoading(false));
  }, [search, severity, status, offset]);

  useEffect(loadPatients, [loadPatients]);
  // Quay lại màn (sau khi nhận bệnh nhân...) -> refresh cả 2 khối.
  useFocusEffect(
    useCallback(() => {
      loadSummary();
      loadPatients();
    }, [loadSummary, loadPatients]),
  );

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {/* ── 4 thẻ tổng quan ── */}
      <View style={styles.cardsRow}>
        <SummaryCard icon="👥" label="Tổng bệnh nhân" value={summary ? String(summary.total_patients) : '—'} color="#2E7D32" />
        <SummaryCard icon="🏃" label="Đang luyện tập" value={summary ? String(summary.practicing) : '—'} color="#1976D2" />
        <SummaryCard icon="⚠️" label="Cần chú ý" value={summary ? String(summary.need_attention) : '—'} color="#E8912D" />
        <SummaryCard
          icon="✅"
          label="Hoàn thành tuần"
          value={summary?.weekly_completion != null ? `${Math.round(summary.weekly_completion)}%` : '—'}
          color="#7C4DFF"
        />
      </View>

      {/* ── Banner cần chú ý ── */}
      {summary && summary.attention_list.length > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            ⚠️ {summary.attention_list.length} bệnh nhân chưa luyện tập trong 3 ngày qua:{' '}
            <Text style={styles.bannerNames}>
              {summary.attention_list.map((a) => a.full_name).join(', ')}
            </Text>
          </Text>
        </View>
      ) : null}

      {/* ── Filter bảng ── */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.search}
          placeholder="🔍 Tìm theo tên..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            setOffset(0);
          }}
        />
        <FilterChips
          options={SEVERITIES}
          value={severity}
          onChange={(v) => {
            setSeverity(v);
            setOffset(0);
          }}
        />
        <FilterChips
          options={['good', 'attention']}
          labels={{ good: 'Tốt', attention: 'Cần chú ý' }}
          value={status}
          onChange={(v) => {
            setStatus(v as 'good' | 'attention' | null);
            setOffset(0);
          }}
        />
      </View>

      {/* ── Bảng bệnh nhân ── */}
      <View style={styles.table}>
        <View style={[styles.tr, styles.thead]}>
          <Text style={[styles.th, styles.colName]}>Bệnh nhân</Text>
          <Text style={[styles.th, styles.colLevel]}>Mức độ</Text>
          <Text style={[styles.th, styles.colNum]}>Tiến độ chương trình</Text>
          <Text style={[styles.th, styles.colNum]}>Điểm TB 2 ngày</Text>
          <Text style={[styles.th, styles.colSmall]}>Chuỗi</Text>
          <Text style={[styles.th, styles.colStatus]}>Trạng thái</Text>
        </View>

        {loading ? (
          <View style={styles.tableCenter}>
            <ActivityIndicator color={GREEN} />
          </View>
        ) : error ? (
          <View style={styles.tableCenter}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.tableCenter}>
            <Text style={styles.muted}>
              Chưa có bệnh nhân nào. Dùng mục “Bệnh nhân” → form “Nhận bệnh nhân” để thêm.
            </Text>
          </View>
        ) : (
          items.map((p) => (
            <Pressable
              key={p.patient_id}
              style={styles.tr}
              onPress={() => router.push(`/(doctor)/patients/${p.patient_id}` as never)}
            >
              <View style={styles.colName}>
                <Text style={styles.name}>{p.full_name}</Text>
                <Text style={styles.sub}>{p.email}</Text>
              </View>
              <View style={styles.colLevel}>
                <Text style={styles.cell}>{p.aphasia_type ?? '—'}</Text>
                <Text style={styles.sub}>{p.severity_level ?? ''}</Text>
              </View>
              <Text style={[styles.cell, styles.colNum]}>
                {p.progress_week != null ? `${Math.round(p.progress_week)}%` : '—'}
              </Text>
              <Text style={[styles.cell, styles.colNum]}>
                {p.avg_score_2days != null ? p.avg_score_2days : '—'}
              </Text>
              <Text style={[styles.cell, styles.colSmall]}>🔥 {p.streak_days}</Text>
              <View style={styles.colStatus}>
                <StatusBadge status={p.status} />
              </View>
            </Pressable>
          ))
        )}
      </View>

      {/* ── Phân trang ── */}
      <View style={styles.pager}>
        <Pressable
          style={[styles.pageBtn, offset === 0 && styles.pageBtnDisabled]}
          disabled={offset === 0}
          onPress={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          <Text style={styles.pageBtnText}>‹ Trước</Text>
        </Pressable>
        <Text style={styles.pageInfo}>
          Trang {page}/{pages} · {total} bệnh nhân
        </Text>
        <Pressable
          style={[styles.pageBtn, offset + PAGE_SIZE >= total && styles.pageBtnDisabled]}
          disabled={offset + PAGE_SIZE >= total}
          onPress={() => setOffset(offset + PAGE_SIZE)}
        >
          <Text style={styles.pageBtnText}>Sau ›</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: 'good' | 'attention' }) {
  const good = status === 'good';
  return (
    <View style={[styles.badge, good ? styles.badgeGood : styles.badgeWarn]}>
      <Text style={[styles.badgeText, good ? styles.badgeTextGood : styles.badgeTextWarn]}>
        {good ? 'Tốt' : 'Cần chú ý'}
      </Text>
    </View>
  );
}

/** Dải chip filter: bấm chip đang chọn lần nữa = bỏ chọn (null = Tất cả). */
function FilterChips({
  options,
  labels,
  value,
  onChange,
}: {
  options: string[];
  labels?: Record<string, string>;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = value === o;
        return (
          <Pressable
            key={o}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(active ? null : o)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {labels?.[o] ?? o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, gap: 16 },

  cardsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  card: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5e9e5',
  },
  cardIcon: { fontSize: 22 },
  cardValue: { fontSize: 30, fontWeight: 'bold' },
  cardLabel: { fontSize: 14, color: '#555' },

  banner: {
    backgroundColor: YELLOW_BG,
    borderWidth: 1,
    borderColor: YELLOW_BORDER,
    borderRadius: 12,
    padding: 14,
  },
  bannerText: { fontSize: 15, color: '#7a5c00' },
  bannerNames: { fontWeight: 'bold' },

  filterRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  search: {
    minWidth: 220,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#cfe3d3',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },

  table: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e9e5', overflow: 'hidden' },
  thead: { backgroundColor: '#f0f5f0' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ee',
    gap: 8,
  },
  th: { fontSize: 13, fontWeight: 'bold', color: '#446' },
  colName: { flex: 2.2 },
  colLevel: { flex: 1.6 },
  colNum: { flex: 1.4, textAlign: 'center' },
  colSmall: { flex: 0.8, textAlign: 'center' },
  colStatus: { flex: 1.2, alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: '#222' },
  sub: { fontSize: 12, color: '#888' },
  cell: { fontSize: 14, color: '#333' },
  tableCenter: { padding: 28, alignItems: 'center' },
  muted: { fontSize: 14, color: '#777', textAlign: 'center' },
  error: { fontSize: 14, color: '#D64545' },

  badge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12 },
  badgeGood: { backgroundColor: '#E7F5E9' },
  badgeWarn: { backgroundColor: '#FFF4D6' },
  badgeText: { fontSize: 13, fontWeight: 'bold' },
  badgeTextGood: { color: GREEN },
  badgeTextWarn: { color: '#B8860B' },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  pageBtn: {
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { color: GREEN, fontWeight: '600' },
  pageInfo: { fontSize: 14, color: '#555' },
});
