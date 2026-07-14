/**
 * Mục "Bệnh nhân" web bác sĩ — form "NHẬN BỆNH NHÂN" + danh sách bệnh nhân của tôi.
 *
 * Form claim TỐI GIẢN -> POST /therapist/patients/claim (Mô hình A — khớp theo SĐT chuẩn hóa):
 *   - CHỈ 1 ô SĐT (bắt buộc; +84/chấm/khoảng trắng đều nhận, backend tự chuẩn hóa).
 *     Body gửi đi CHỈ { phone } — các field hồ sơ (aphasia/hospital/severity/baseline)
 *     backend nhận optional nên bỏ khỏi UI không cần đổi backend; bổ sung hồ sơ tính sau.
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

export default function DoctorPatientsScreen() {
  const router = useRouter();

  // ── Form claim tối giản: CHỈ số điện thoại ──
  const [phoneInput, setPhoneInput] = useState('');
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

  async function onSubmit() {
    if (!phoneInput.trim()) {
      setMessage({ ok: false, text: 'Vui lòng nhập số điện thoại bệnh nhân.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      // Body CHỈ { phone } — backend tự chuẩn hóa (+84/chấm/khoảng trắng đều nhận);
      // các field hồ sơ khác là optional, không gửi.
      const res = await claimPatient({ phone: phoneInput.trim() });
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
          SĐT của họ để nhận vào danh sách của bạn.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Số điện thoại bệnh nhân (bắt buộc, vd 0912345678)"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phoneInput}
          onChangeText={setPhoneInput}
        />

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
              onPress={() => router.push(`/doctor/patients/${p.patient_id}` as never)}
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

const styles = StyleSheet.create({
  body: { padding: 24, gap: 16 },
  panel: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e9e5', padding: 18, gap: 12 },
  panelTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  hint: { fontSize: 14, color: '#777' },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
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
