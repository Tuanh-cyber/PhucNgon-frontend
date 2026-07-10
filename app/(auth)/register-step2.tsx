/**
 * Đăng ký — Bước 2: THÔNG TIN BỆNH theo chẩn đoán (Ảnh mockup "THÔNG TIN BỆNH").
 *
 * Form: Loại aphasia (text tự do), Mức độ bệnh (giới hạn đúng 3 lựa chọn),
 *       Bệnh viện đã khám (optional), Bác sĩ phụ trách (optional).
 *   3 field accuracy/completion/fluency_score KHÔNG hiển thị (mockup không có) — gửi null,
 *   bác sĩ có thể nhập sau.
 *
 * Bấm "Tiếp tục":
 *   setStep2Data -> getFullPayload -> registerPatient -> login(token) -> reset
 *   -> /(patient)/recommended-exercises (bước 3 mới "Bài tập đề xuất" — màn Kết quả đánh giá
 *      ban đầu cũ đã bị gỡ khỏi luồng).
 *   Lỗi 409 (email trùng) / 422 (định dạng sai) hiện thông báo rõ ràng.
 *
 * Chỉ xử lý luồng bệnh nhân. PHẠM VI: đúng chức năng, chưa tinh chỉnh màu/font theo ảnh.
 */

import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { registerPatient } from '@/src/api/auth';
import { useAuth } from '@/src/context/AuthContext';
import { useRegistration } from '@/src/context/RegistrationContext';

/**
 * 3 mức độ bệnh HỢP LỆ — PHẢI khớp chính xác bảng ánh xạ severity_level -> vocab_level ở
 * Backend. Gõ sai chính tả thì Backend fallback về vocab_level=1 (không báo lỗi) nên Frontend
 * giới hạn lựa chọn thay vì cho gõ tự do, tránh sai chính tả âm thầm.
 */
const SEVERITY_OPTIONS = ['Nặng', 'Trung bình', 'Nhẹ'] as const;

/**
 * 3 lựa chọn loại aphasia — CHỌN thay vì gõ tay. Chuỗi PHẢI giữ đúng nguyên văn vì backend
 * map aphasia_type -> profile bệnh (Broca->broca_like, Wernicke->wernicke_like,
 * "Loại Aphasia khác"->mixed) để tính "Bài tập đề xuất".
 */
const APHASIA_OPTIONS = ['Broca', 'Wernicke', 'Loại Aphasia khác'] as const;

/** Màu chữ placeholder — nhạt hơn chữ nhập thật. */
const PLACEHOLDER_COLOR = '#9a9a9a';

export default function RegisterStep2Screen() {
  const router = useRouter();
  const { login } = useAuth();
  const { setStep2Data, getFullPayload, reset } = useRegistration();

  // State khởi tạo RỖNG — không điền sẵn giá trị mẫu; người dùng phải tự chọn/nhập.
  const [aphasiaType, setAphasiaType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [hospital, setHospital] = useState('');
  const [doctor, setDoctor] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onContinue() {
    setError(null);
    setSubmitting(true);
    try {
      const step2 = {
        aphasia_type: aphasiaType ?? '', // chưa chọn -> gửi rỗng (optional; backend coi là mixed)
        severity_level: severity ?? '',
        hospital_name: hospital.trim(),
        referring_doctor_name: doctor.trim(),
      };
      setStep2Data(step2); // lưu vào context (để giữ dữ liệu nếu quay lại)
      // Truyền step2 TRỰC TIẾP — không dựa vào state vừa set (setState bất đồng bộ).
      const payload = getFullPayload(step2);
      const { access_token } = await registerPatient(payload);

      await login(access_token);
      reset(); // xoá dữ liệu tạm sau khi đăng ký thành công.
      // Bước 3 mới: "Bài tập đề xuất" (thay màn Kết quả đánh giá ban đầu cũ).
      router.replace('/(patient)/recommended-exercises');
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Đăng ký — Thông tin bệnh</Text>
      <StepBar current={2} />

      <View style={styles.field}>
        <Text style={styles.label}>Loại aphasia</Text>
        {/* CHỌN thay vì gõ tay — chuỗi phải khớp mapping profile ở backend (xem APHASIA_OPTIONS) */}
        <View style={styles.optionRow}>
          {APHASIA_OPTIONS.map((opt) => {
            const selected = aphasiaType === opt;
            return (
              <Pressable
                key={opt}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setAphasiaType(opt)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Mức độ bệnh</Text>
        <View style={styles.optionRow}>
          {SEVERITY_OPTIONS.map((opt) => {
            const selected = severity === opt;
            return (
              <Pressable
                key={opt}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setSeverity(opt)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Bệnh viện đã khám (không bắt buộc)</Text>
        <TextInput
          style={[styles.input, !hospital && styles.inputPlaceholder]}
          placeholder="Ví dụ: Bệnh viện Y dược TP.HCM"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={hospital}
          onChangeText={setHospital}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Bác sĩ phụ trách (không bắt buộc)</Text>
        <TextInput
          style={[styles.input, !doctor && styles.inputPlaceholder]}
          placeholder="Ví dụ: BS. Nguyễn Thanh Phúc"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={doctor}
          onChangeText={setDoctor}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onContinue}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Tiếp tục</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

/**
 * Chuyển lỗi từ registerPatient thành thông báo tiếng Việt rõ ràng.
 *  - 409: email HOẶC số điện thoại đã tồn tại (phân biệt qua detail — Mô hình A chống trùng số).
 *  - 422: sai định dạng — lấy chi tiết từ response (detail có thể là chuỗi hoặc mảng lỗi pydantic).
 */
function toErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 409) {
      const detail409 = err.response?.data?.detail;
      if (typeof detail409 === 'string' && detail409.includes('Số điện thoại')) {
        return 'Số điện thoại này đã được đăng ký cho bệnh nhân khác. Vui lòng quay lại bước 1 kiểm tra lại số.';
      }
      return 'Email này đã được đăng ký. Vui lòng quay lại bước 1 đổi email khác hoặc đăng nhập.';
    }
    if (status === 422) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') return `Dữ liệu chưa hợp lệ: ${detail}`;
      if (Array.isArray(detail)) {
        const msgs = detail.map((d: { msg?: string }) => d?.msg).filter(Boolean);
        if (msgs.length) return `Dữ liệu chưa hợp lệ: ${msgs.join('; ')}`;
      }
      return 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại thông tin đã nhập.';
    }
  }
  return 'Đăng ký thất bại. Vui lòng thử lại.';
}

/** Thanh bước 1-2-3, đánh dấu bước hiện tại (chỉ cần đúng chức năng, chưa làm đẹp). */
function StepBar({ current }: { current: number }) {
  return (
    <View style={styles.stepBar}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={styles.stepItem}>
          <View style={[styles.stepDot, n === current && styles.stepDotActive]}>
            <Text style={[styles.stepNum, n === current && styles.stepNumActive]}>{n}</Text>
          </View>
          {n < 3 ? <View style={styles.stepLine} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  field: { gap: 6 },
  label: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  // Áp dụng KHI ô còn trống -> placeholder in nghiêng; gõ vào tự thành chữ thẳng.
  inputPlaceholder: { fontStyle: 'italic' },
  error: { color: 'red', fontSize: 15 },
  optionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  chipSelected: { backgroundColor: '#1f7a4d', borderColor: '#1f7a4d' },
  chipText: { fontSize: 16 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  button: {
    backgroundColor: '#1f7a4d',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  stepBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f7a4d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#1f7a4d' },
  stepNum: { color: '#1f7a4d', fontWeight: 'bold' },
  stepNumActive: { color: '#fff' },
  stepLine: { width: 28, height: 1, backgroundColor: '#1f7a4d' },
});
