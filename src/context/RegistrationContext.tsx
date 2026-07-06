/**
 * RegistrationContext — kho chứa TẠM dữ liệu đăng ký bệnh nhân giữa 2 bước.
 *
 * Luồng: register-step1 (thông tin cá nhân) -> register-step2 (thông tin bệnh) -> gọi API.
 * Vì dữ liệu trải qua 2 màn hình khác nhau nên cần 1 nơi giữ tạm, tránh nhồi hết vào query
 * param của URL (dễ rối, lộ thông tin). Sau khi đăng ký xong PHẢI gọi reset() để xoá sạch.
 *
 * `address` (Địa chỉ) và `caregiver_phone` (SĐT người chăm sóc) đều OPTIONAL, backend nhận
 * qua PatientRegisterRequest và lưu vào bảng Profile (address -> Profile.address,
 * caregiver_phone -> Profile.emergency_contact). getFullPayload() gửi kèm khi có giá trị.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Gender, PatientRegisterRequest } from '@/src/types/api';

/** Dữ liệu bước 1 — Thông tin cá nhân (Ảnh "ĐĂNG KÝ — THÔNG TIN CÁ NHÂN"). */
export interface Step1Data {
  full_name: string;
  age: number;
  gender: Gender;
  phone_number: string; // SĐT của BỆNH NHÂN
  address: string; // OPTIONAL — gửi lên API, lưu vào Profile.address.
  caregiver_phone: string; // OPTIONAL — SĐT người chăm sóc, lưu vào Profile.emergency_contact.
  // email + password KHÔNG có trong mockup nhưng API bắt buộc — buộc phải thu ở bước 1.
  email: string;
  password: string;
}

/** Dữ liệu bước 2 — Thông tin bệnh theo chẩn đoán (Ảnh "THÔNG TIN BỆNH"). */
export interface Step2Data {
  aphasia_type: string;
  severity_level: string;
  hospital_name: string;
  referring_doctor_name: string;
}

interface RegistrationContextValue {
  step1: Step1Data | null;
  step2: Step2Data | null;
  setStep1Data: (data: Step1Data) => void;
  setStep2Data: (data: Step2Data) => void;
  /**
   * Gộp cả 2 bước thành body khớp PatientRegisterRequest. Ném lỗi nếu thiếu bước 1.
   *
   * step2 truyền TRỰC TIẾP vào (không đọc từ state) để tránh lỗi "state chưa cập nhật kịp":
   * màn step2 gọi setStep2Data() rồi getFullPayload() ngay trong cùng 1 lần bấm — nếu
   * getFullPayload đọc step2 từ state thì vẫn là giá trị cũ (null) do setState là bất đồng bộ.
   */
  getFullPayload: (step2: Step2Data) => PatientRegisterRequest;
  /** Xoá sạch context sau khi đăng ký xong (tránh rò dữ liệu sang lần đăng ký sau). */
  reset: () => void;
}

const RegistrationContext = createContext<RegistrationContextValue | undefined>(undefined);

/**
 * Quy đổi Tuổi -> date_of_birth theo đúng công thức đã thống nhất:
 *   year = năm hiện tại - tuổi ; date_of_birth = "YYYY-01-01".
 * Đây là XẤP XỈ (chỉ suy ra năm sinh, mặc định ngày 01/01) vì mockup chỉ hỏi tuổi, không hỏi
 * ngày sinh chính xác — đủ dùng cho phân nhóm/thống kê hiện tại.
 */
function ageToDateOfBirth(age: number): string {
  const birthYear = new Date().getFullYear() - age;
  return `${birthYear}-01-01`;
}

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [step1, setStep1] = useState<Step1Data | null>(null);
  const [step2, setStep2] = useState<Step2Data | null>(null);

  const setStep1Data = useCallback((data: Step1Data) => setStep1(data), []);
  const setStep2Data = useCallback((data: Step2Data) => setStep2(data), []);

  const reset = useCallback(() => {
    setStep1(null);
    setStep2(null);
  }, []);

  const getFullPayload = useCallback(
    (step2Data: Step2Data): PatientRegisterRequest => {
      if (!step1) {
        throw new Error('Thiếu dữ liệu bước 1 (thông tin cá nhân).');
      }
      const step2 = step2Data;

      return {
      full_name: step1.full_name,
      email: step1.email,
      password: step1.password,
      phone_number: step1.phone_number,
      date_of_birth: ageToDateOfBirth(step1.age),
      gender: step1.gender,
      // Optional — gửi khi có, undefined khi để trống (backend lưu vào Profile).
      address: step1.address || undefined,
      caregiver_phone: step1.caregiver_phone || undefined,
      // Các field bệnh — optional theo contract. Gửi khi có, undefined khi để trống.
      aphasia_type: step2.aphasia_type || undefined,
      severity_level: step2.severity_level || undefined,
      hospital_name: step2.hospital_name || undefined,
      referring_doctor_name: step2.referring_doctor_name || undefined,
      // 3 điểm đánh giá ban đầu: KHÔNG thu ở màn đăng ký (bác sĩ có thể nhập sau) -> null.
      accuracy_score: null,
      completion_score: null,
      fluency_score: null,
      };
    },
    [step1],
  );

  const value = useMemo<RegistrationContextValue>(
    () => ({ step1, step2, setStep1Data, setStep2Data, getFullPayload, reset }),
    [step1, step2, setStep1Data, setStep2Data, getFullPayload, reset],
  );

  return (
    <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
  );
}

/** Hook dùng chung cho 2 màn đăng ký: gọi useRegistration() để đọc/ghi dữ liệu tạm. */
export function useRegistration(): RegistrationContextValue {
  const ctx = useContext(RegistrationContext);
  if (ctx === undefined) {
    throw new Error('useRegistration() phải được dùng bên trong <RegistrationProvider>');
  }
  return ctx;
}
