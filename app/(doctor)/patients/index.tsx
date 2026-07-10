/**
 * Mục "Bệnh nhân" web bác sĩ — form "NHẬN BỆNH NHÂN" + danh sách bệnh nhân của tôi.
 *
 * Form claim -> POST /therapist/patients/claim (Mô hình A — khớp theo SĐT chuẩn hóa):
 *   - phone (bắt buộc; +84/chấm/khoảng trắng đều nhận, backend tự chuẩn hóa) + optional:
 *     aphasia_type (chip chọn 1), hospital_name, severity_level (chip), 3 điểm baseline.
 *   - Kết quả: 200 claimed/updated -> "Đã nhận bệnh nhân" + refresh danh sách;
 *     404 -> "Không tìm thấy... (cần đăng ký kèm SĐT trước)"; 422 -> số không hợp lệ;
 *     409 phân biệt qua detail: trùng số / chưa có plan / thuộc bác sĩ khác.
 * Danh sách <- GET /therapist/me/patients (đơn giản; bảng đầy đủ nằm ở Tổng quan).
 */

import axios from 'axios';
import { useRouter } from 'expo-router';
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

import { claimPatient, getMyPatients } from '@/src/api/therapist';
import type { TherapistPatientItem } from '@/src/types/api';

const GREEN = '#2E7D32';
const APHASIA_TYPES = ['Broca', 'Wernicke', 'Anomic', 'Global', 'Conduction', 'Mixed', 'Khác'];
const SEVERITIES = ['Nhẹ', 'Trung bình', 'Nặng'];

export default function DoctorPatientsScreen() {
  const router = useRouter();

  // ── Form claim (khớp bệnh nhân theo SĐT — Mô hình A) ──
  const [phoneInput, setPhoneInput] = useState('');
  const [aphasia, setAphasia] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [hospital, setHospital] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [completion, setCompletion] = useState('');
  const [fluency, setFluency] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Danh sách của tôi ──
  const [items, setItems] = useState<TherapistPatientItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(() => {
    setLoading(true);
    getMyPatients({ limit: 100 })
      .then((d) => setItems(d.items))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);
  useEffect(loadList, [loadList]);

  function parseScore(s: string): number | undefined {
    const t = s.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }

  async function onSubmit() {
    if (!phoneInput.trim()) {
      setMessage({ ok: false, text: 'Vui lòng nhập số điện thoại bệnh nhân.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await claimPatient({
        phone: phoneInput.trim(), // backend tự chuẩn hóa (+84/chấm/khoảng trắng đều nhận)
        aphasia_type: aphasia ?? undefined,
        severity_level: severity ?? undefined,
        hospital_name: hospital.trim() || undefined,
        accuracy_score: parseScore(accuracy),
        completion_score: parseScore(completion),
        fluency_score: parseScore(fluency),
      });
      setMessage({
        ok: true,
        text:
          res.status === 'claimed'
            ? `✅ Đã nhận bệnh nhân ${res.full_name}.`
            : `✅ Đã cập nhật hồ sơ bệnh nhân ${res.full_name}.`,
      });
      setPhoneInput('');
      loadList(); // refresh danh sách ngay
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setMessage({
          ok: false,
          text: 'Không tìm thấy bệnh nhân với số này (bệnh nhân cần đăng ký kèm SĐT trước).',
        });
      } else if (axios.isAxiosError(err) && err.response?.status === 409) {
        // Backend phân biệt 3 loại 409 qua detail: trùng số / chưa có plan / thuộc bác sĩ khác.
        const detail = (err.response.data as { detail?: string })?.detail ?? '';
        setMessage({
          ok: false,
          text: detail.includes('trùng số')
            ? 'Nhiều bệnh nhân trùng số này — cần xác định thêm (liên hệ hỗ trợ).'
            : detail.includes('kế hoạch')
              ? 'Bệnh nhân chưa có kế hoạch trị liệu.'
              : 'Bệnh nhân đã thuộc bác sĩ khác.',
        });
      } else if (axios.isAxiosError(err) && err.response?.status === 422) {
        setMessage({
          ok: false,
          text: 'Số điện thoại không hợp lệ (cần số VN 10-11 chữ số, vd 0912345678).',
        });
      } else {
        setMessage({ ok: false, text: 'Không gửi được yêu cầu. Vui lòng thử lại.' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {/* ── Form nhận bệnh nhân ── */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>➕ Nhận bệnh nhân</Text>
        <Text style={styles.hint}>
          Bệnh nhân cần ĐĂNG KÝ tài khoản trên app (kèm số điện thoại) trước; sau đó nhập
          SĐT của họ để nhận vào danh sách của bạn và điền thông tin chẩn đoán.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Số điện thoại bệnh nhân (bắt buộc, vd 0912345678)"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phoneInput}
          onChangeText={setPhoneInput}
        />

        <Text style={styles.fieldLabel}>Loại aphasia</Text>
        <ChipGroup options={APHASIA_TYPES} value={aphasia} onChange={setAphasia} />

        <Text style={styles.fieldLabel}>Mức độ</Text>
        <ChipGroup options={SEVERITIES} value={severity} onChange={setSeverity} />

        <TextInput
          style={styles.input}
          placeholder="Bệnh viện (tuỳ chọn)"
          placeholderTextColor="#999"
          value={hospital}
          onChangeText={setHospital}
        />

        <Text style={styles.fieldLabel}>Điểm baseline (tuỳ chọn, 0-100)</Text>
        <View style={styles.scoreRow}>
          <TextInput style={[styles.input, styles.scoreInput]} placeholder="Chính xác" placeholderTextColor="#999" keyboardType="numeric" value={accuracy} onChangeText={setAccuracy} />
          <TextInput style={[styles.input, styles.scoreInput]} placeholder="Hoàn thành" placeholderTextColor="#999" keyboardType="numeric" value={completion} onChangeText={setCompletion} />
          <TextInput style={[styles.input, styles.scoreInput]} placeholder="Trôi chảy" placeholderTextColor="#999" keyboardType="numeric" value={fluency} onChangeText={setFluency} />
        </View>

        {message ? (
          <Text style={[styles.message, message.ok ? styles.messageOk : styles.messageErr]}>
            {message.text}
          </Text>
        ) : null}

        <Pressable style={[styles.submitBtn, submitting && styles.disabled]} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Nhận bệnh nhân</Text>}
        </Pressable>
      </View>

      {/* ── Danh sách của tôi ── */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Bệnh nhân của tôi ({items.length})</Text>
        {loading ? (
          <ActivityIndicator color={GREEN} />
        ) : items.length === 0 ? (
          <Text style={styles.hint}>Chưa có bệnh nhân nào — dùng form phía trên để nhận.</Text>
        ) : (
          items.map((p) => (
            <Pressable
              key={p.patient_id}
              style={styles.row}
              onPress={() => router.push(`/(doctor)/patients/${p.patient_id}` as never)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{p.full_name}</Text>
                <Text style={styles.rowSub}>
                  {p.email}
                  {p.aphasia_type ? ` · ${p.aphasia_type}` : ''}
                  {p.severity_level ? ` · ${p.severity_level}` : ''}
                </Text>
              </View>
              <Text style={styles.rowChevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = value === o;
        return (
          <Pressable key={o} style={[styles.chip, active && styles.chipActive]} onPress={() => onChange(active ? null : o)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, gap: 16 },
  panel: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e9e5', padding: 18, gap: 12 },
  panelTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  hint: { fontSize: 14, color: '#777' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#444' },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  scoreRow: { flexDirection: 'row', gap: 10 },
  scoreInput: { flex: 1 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderColor: '#cfe3d3', borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: '#fff' },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 14, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  message: { fontSize: 14, fontWeight: '600' },
  messageOk: { color: GREEN },
  messageErr: { color: '#D64545' },
  submitBtn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ee',
    gap: 10,
  },
  rowName: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowSub: { fontSize: 13, color: '#888' },
  rowChevron: { fontSize: 24, color: GREEN, fontWeight: 'bold' },
});
