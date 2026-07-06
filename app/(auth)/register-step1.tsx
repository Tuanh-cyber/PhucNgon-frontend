/**
 * Đăng ký — Bước 1: THÔNG TIN CÁ NHÂN (Ảnh mockup "ĐĂNG KÝ — THÔNG TIN CÁ NHÂN").
 *
 * Form: Họ và tên, Tuổi, Giới tính, SĐT bệnh nhân, SĐT người chăm sóc (optional), Địa chỉ.
 *   + THÊM 2 ô KHÔNG có trong mockup nhưng API bắt buộc: Email, Mật khẩu
 *     (PatientRegisterRequest yêu cầu email + password để tạo tài khoản — xem docs/API_CONTRACT.md).
 *
 * Nhận query param `role` từ màn Chọn vai trò. Màn này CHỈ xử lý luồng bệnh nhân (patient);
 * mockup chưa có thiết kế cho bác sĩ nên chưa làm luồng therapist.
 *
 * Validate trước khi cho "Tiếp tục", nếu sai hiện chữ đỏ dưới ô tương ứng, KHÔNG chuyển bước.
 * Hợp lệ -> setStep1Data() vào RegistrationContext -> /register-step2?role=<role>.
 *
 * Placeholder "Ví dụ: ..." hiển thị chữ MỜ + IN NGHIÊNG (italic khi ô còn trống, tự chuyển
 * chữ thẳng khi người dùng bắt đầu gõ).
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Gender } from '@/src/types/api';
import { useRegistration } from '@/src/context/RegistrationContext';

/** Lựa chọn giới tính hiển thị (tiếng Việt) -> enum API. */
const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Nam', value: 'male' },
  { label: 'Nữ', value: 'female' },
  { label: 'Khác', value: 'other' },
];

/** SĐT Việt Nam đơn giản: 10 chữ số, bắt đầu bằng 0. */
const PHONE_RE = /^0\d{9}$/;
/** Email tối thiểu có dạng a@b.c — kiểm cơ bản để tránh 422 rõ ràng. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Màu chữ placeholder — nhạt hơn chữ nhập thật. */
const PLACEHOLDER_COLOR = '#9a9a9a';

type Errors = Partial<
  Record<
    'full_name' | 'age' | 'phone_number' | 'caregiver_phone' | 'email' | 'password',
    string
  >
>;

export default function RegisterStep1Screen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { setStep1Data } = useRegistration();

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [phone, setPhone] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Chỉ hiện lỗi đỏ SAU KHI user bấm "Tiếp tục" lần đầu (attempted=true). Trước đó, dù ô còn
  // trống cũng KHÔNG hiện đỏ — tránh "lỗi giả" ngay lúc mới mở màn hình. Sau lần bấm đầu, lỗi
  // được tính lại mỗi lần render nên sẽ tự biến mất ngay khi user sửa đúng.
  const [attempted, setAttempted] = useState(false);

  const ageNum = Number(age);

  function computeErrors(): Errors {
    const next: Errors = {};

    if (!fullName.trim()) {
      next.full_name = 'Vui lòng nhập họ và tên.';
    }

    // So sánh trên SỐ (Number(age)) — không so sánh chuỗi. age rỗng -> NaN -> báo lỗi.
    if (!age.trim() || !Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120) {
      next.age = 'Tuổi phải là số từ 1 đến 120.';
    }

    if (!PHONE_RE.test(phone.trim())) {
      next.phone_number = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.';
    }

    // SĐT người chăm sóc OPTIONAL — chỉ kiểm định dạng NẾU có nhập.
    if (caregiverPhone.trim() && !PHONE_RE.test(caregiverPhone.trim())) {
      next.caregiver_phone = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.';
    }

    // email + password KHÔNG có trong mockup nhưng API bắt buộc.
    if (!EMAIL_RE.test(email.trim())) {
      next.email = 'Email chưa đúng định dạng (vd: ten@example.com).';
    }
    if (password.length < 6) {
      next.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }

    return next;
  }

  const errors: Errors = attempted ? computeErrors() : {};

  function onContinue() {
    setAttempted(true);
    if (Object.keys(computeErrors()).length > 0) return;

    setStep1Data({
      full_name: fullName.trim(),
      age: ageNum,
      gender,
      phone_number: phone.trim(),
      caregiver_phone: caregiverPhone.trim(),
      address: address.trim(),
      email: email.trim(),
      password,
    });

    // Giữ nguyên role để bước sau dùng lại (mặc định patient nếu vào thẳng màn này).
    router.push(`/(auth)/register-step2?role=${role ?? 'patient'}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Đăng ký — Thông tin cá nhân</Text>
      <StepBar current={1} />

      <Field label="Họ và tên" error={errors.full_name}>
        <TextInput
          style={[styles.input, !fullName && styles.inputPlaceholder]}
          placeholder="Ví dụ: Nguyễn Văn A"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={fullName}
          onChangeText={setFullName}
        />
      </Field>

      <Field label="Tuổi" error={errors.age}>
        <TextInput
          style={[styles.input, !age && styles.inputPlaceholder]}
          placeholder="Ví dụ: 62"
          placeholderTextColor={PLACEHOLDER_COLOR}
          keyboardType="number-pad"
          value={age}
          onChangeText={setAge}
        />
      </Field>

      <Field label="Giới tính">
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((opt) => {
            const selected = gender === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setGender(opt.value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Số điện thoại của bệnh nhân" error={errors.phone_number}>
        <TextInput
          style={[styles.input, !phone && styles.inputPlaceholder]}
          placeholder="Ví dụ: 0912345678"
          placeholderTextColor={PLACEHOLDER_COLOR}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </Field>

      <Field label="Số điện thoại của người chăm sóc (không bắt buộc)" error={errors.caregiver_phone}>
        <TextInput
          style={[styles.input, !caregiverPhone && styles.inputPlaceholder]}
          placeholder="Ví dụ: 0987654321"
          placeholderTextColor={PLACEHOLDER_COLOR}
          keyboardType="phone-pad"
          value={caregiverPhone}
          onChangeText={setCaregiverPhone}
        />
      </Field>

      <Field label="Địa chỉ">
        <TextInput
          style={[styles.input, !address && styles.inputPlaceholder]}
          placeholder="Ví dụ: 268 đường Lý Thường Kiệt, phường Diên Hồng, TP.HCM"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={address}
          onChangeText={setAddress}
        />
      </Field>

      {/* 2 ô dưới KHÔNG có trong mockup — thêm vì API bắt buộc email + password. */}
      <Field label="Email (bắt buộc để tạo tài khoản)" error={errors.email}>
        <TextInput
          style={[styles.input, !email && styles.inputPlaceholder]}
          placeholder="Ví dụ: nguyenvana@email.com"
          placeholderTextColor={PLACEHOLDER_COLOR}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </Field>

      <Field label="Mật khẩu (bắt buộc để tạo tài khoản)" error={errors.password}>
        <TextInput
          style={[styles.input, !password && styles.inputPlaceholder]}
          placeholder="Tối thiểu 6 ký tự"
          placeholderTextColor={PLACEHOLDER_COLOR}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </Field>

      <Pressable style={styles.button} onPress={onContinue}>
        <Text style={styles.buttonText}>Tiếp tục</Text>
      </Pressable>
    </ScrollView>
  );
}

/** Ô nhập kèm nhãn + dòng lỗi đỏ (nếu có). */
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
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
  // Áp dụng KHI ô còn trống -> placeholder in nghiêng; gõ vào (ô có giá trị) tự thành chữ thẳng.
  inputPlaceholder: { fontStyle: 'italic' },
  error: { color: 'red', fontSize: 14 },
  genderRow: { flexDirection: 'row', gap: 10 },
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
