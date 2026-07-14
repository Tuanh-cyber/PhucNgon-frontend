/**
 * TypeScript interfaces cho MỌI request/response trong docs/API_CONTRACT.md.
 *
 * QUY TẮC: tên field copy CHÍNH XÁC theo API_CONTRACT.md — KHÔNG đổi tên, KHÔNG thêm field
 * không có trong contract. Field nào contract ghi rõ có thể null/optional thì để `?` và
 * `| null` cho đúng.
 *
 * Nguồn: docs/API_CONTRACT.md
 */

/** Giới tính — khớp enum backend. */
export type Gender = 'male' | 'female' | 'other';

/** Vai trò trả về trong token/response. */
export type Role = 'patient' | 'therapist';

// ── 1. Auth ─────────────────────────────────────────────────────────────────

/** POST /auth/register/patient — body. */
export interface PatientRegisterRequest {
  full_name: string;
  email: string;
  password: string;
  phone_number?: string; // SĐT của BỆNH NHÂN
  date_of_birth: string; // ISO date "1962-01-01"
  gender: Gender;
  // Các field dưới đây contract ghi rõ đều OPTIONAL:
  address?: string; // lưu vào Profile.address ở backend
  caregiver_phone?: string; // SĐT người chăm sóc -> Profile.emergency_contact ở backend
  aphasia_type?: string;
  severity_level?: string;
  hospital_name?: string;
  referring_doctor_name?: string;
  accuracy_score?: number | null;
  completion_score?: number | null;
  fluency_score?: number | null;
}

/** POST /auth/register/therapist — body. */
export interface TherapistRegisterRequest {
  full_name: string;
  email: string;
  password: string;
  phone_number?: string;
  license_no: string; // bắt buộc
  specialization?: string;
}

/** POST /auth/login — body. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Response chung cho register + login. */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: Role;
}

/** GET /auth/me — response. */
export interface MeResponse {
  user_id: string;
  full_name: string;
  email: string;
  role: Role;
}

// ── 2. Assessment ───────────────────────────────────────────────────────────

/** GET /patients/me/initial-assessment — response. 3 field điểm có thể null. */
export interface InitialAssessmentResponse {
  aphasia_type: string | null;
  severity_level: string | null;
  hospital_name: string | null;
  referring_doctor_name: string | null;
  accuracy_score: number | null;
  completion_score: number | null;
  fluency_score: number | null;
}

/**
 * GET /patients/me/stats — 3 chỉ số TÍNH TỰ ĐỘNG từ lịch sử làm bài thật (khác
 * InitialAssessmentResponse là số bác sĩ nhập tay lúc đăng ký). Mỗi field null = "chưa có
 * dữ liệu để tính". Endpoint này CÓ trong backend (app/routers/assessments.py) nhưng chưa
 * được liệt kê trong API_CONTRACT.md.
 */
export interface PatientStatsResponse {
  accuracy_score: number | null;
  completion_score: number | null;
  fluency_score: number | null;
}

/**
 * GET /patients/me/recommended-exercises — 1 phần tử gợi ý loại bài theo profile bệnh
 * (rule.md "Profile => Exercise Weight"). Chỉ để HIỂN THỊ — không đổi logic giao bài.
 */
export interface RecommendedExercise {
  exercise_type: string;
  display_name: string;
  weight: number;
  recommended: boolean; // weight >= 0.3
}

// ── 3. Plans ────────────────────────────────────────────────────────────────

/** 1 nhóm bài trong TodayPlanResponse.exercises. */
export interface TodayExerciseSummary {
  exercise_type: string;
  display_name: string;
  total_assigned: number;
  completed_count: number;
  completion_percent: number;
}

/** GET /plans/me/today — response. */
export interface TodayPlanResponse {
  plan_id: string;
  exercises: TodayExerciseSummary[];
}

/**
 * 1 bài cụ thể trong danh sách bài — GET /plans/me/assignments?type=...&topic=...
 * (khớp AssignmentListItem trong backend app/schemas/content.py).
 * type="mixed" -> bài của cả 3 dạng, backend đã trộn sẵn (ổn định trong ngày).
 */
export interface PlanAssignment {
  assignment_id: string;
  exercise_id: string;
  exercise_type: string;
  topic: string; // enum value, vd "food_drink"
  order_index: number;
  status: 'pending' | 'completed';
}

/** 1 topic CÓ BÀI trong plan — GET /plans/me/topics?type=... */
export interface TopicSummary {
  topic: string; // enum value, vd "food_drink"
  topic_display: string; // tên tiếng Việt, vd "Ăn uống"
  total_count: number;
  completed_count: number;
}

// ── Dashboard tiến trình — GET /patients/me/progress-dashboard ──────────────

/** Điểm 1 ngày cho biểu đồ 7 ngày. avg_score=null = ngày không tập. */
export interface DailyScore {
  date: string; // YYYY-MM-DD
  avg_score: number | null;
  session_count: number;
}

export interface StreakInfo {
  current_streak_days: number;
  active_days_last_30: string[]; // các ngày YYYY-MM-DD có luyện tập
}

export interface DifficultWord {
  word: string;
  attempts: number;
  fail_count: number;
  exercise_type: string;
}

/** GET /patients/me/progress-dashboard — response. */
export interface ProgressDashboard {
  daily_scores: DailyScore[]; // đúng 7 phần tử, cũ -> mới (cuối = hôm nay) — dùng biểu đồ đường + heat-map chi tiết
  daily_scores_30: DailyScore[]; // đúng 30 phần tử, cũ -> mới — dùng heat-map 30 ngày đầy đủ
  streak: StreakInfo;
  difficult_words: DifficultWord[]; // tối đa 10, rỗng = chưa đủ dữ liệu
}

// ── Web bác sĩ — /therapist/* (mục 6 API_CONTRACT) ───────────────────────────

/** 1 dòng bảng bệnh nhân của bác sĩ (GET /therapist/me/patients). */
export interface TherapistPatientItem {
  patient_id: string;
  full_name: string;
  email: string;
  aphasia_type: string | null;
  severity_level: string | null;
  hospital_name: string | null;
  progress_week: number | null; // % hoàn thành CẤP PLAN (không phải tuần)
  avg_score_2days: number | null;
  streak_days: number;
  sessions_per_week: number; // 0-7, hiển thị "x/7"
  status: 'good' | 'attention';
}

/** GET /therapist/me/patients — response (total = tổng SAU filter). */
export interface TherapistPatientList {
  total: number;
  items: TherapistPatientItem[];
}

/** GET /therapist/dashboard-summary — 4 thẻ + banner. */
export interface DashboardSummary {
  total_patients: number;
  practicing: number;
  need_attention: number;
  weekly_completion: number | null;
  attention_list: { patient_id: string; full_name: string }[];
}

/** Khối hồ sơ đầu màn chi tiết bệnh nhân. */
export interface PatientHeader {
  full_name: string;
  age: number;
  aphasia_type: string | null;
  severity_level: string | null;
  hospital_name: string | null;
  doctor_name: string;
}

/** GET /therapist/patients/{id} — chi tiết 1 bệnh nhân của tôi. */
export interface TherapistPatientDetail {
  patient: PatientHeader;
  dashboard: ProgressDashboard;
  stats: {
    accuracy_score: number | null;
    completion_score: number | null;
    fluency_score: number | null;
  };
  avg_score_day: number | null;
  sessions_per_week: number;
  score_delta_vs_last_week: number | null;
  insight: { type: 'ok' | 'warn'; text: string };
}

/** POST /therapist/patients/claim — body (khớp bệnh nhân theo SĐT đã chuẩn hóa, Mô hình A). */
export interface ClaimPatientRequest {
  phone: string;
  aphasia_type?: string;
  hospital_name?: string;
  severity_level?: string;
  accuracy_score?: number | null;
  completion_score?: number | null;
  fluency_score?: number | null;
}

/** POST /therapist/patients/claim — response. */
export interface ClaimPatientResponse {
  patient_id: string;
  full_name: string;
  status: 'claimed' | 'updated';
}

// ── Từ vựng flashcard — GET /vocabulary ──────────────────────────────────────

/** 1 từ vựng cho màn flashcard (ảnh + từ + audio phát âm). */
export interface VocabularyItem {
  vocab_id: string;
  word: string; // canonical_word
  topic: string; // enum value, vd "food_drink"
  word_type: string; // noun | verb | adjective
  image_url: string | null; // /static/pictures/...; null nếu thiếu file
  audio_url: string | null; // /static/vocab-audio/...; null nếu thiếu file
}

// ── Nội dung chi tiết 1 bài — GET /assignments/{id}/content ─────────────────
// Khớp app/schemas/content.py backend. Mọi *_url là đường dẫn TƯƠNG ĐỐI (/static/...),
// null khi file thiếu — dùng buildAssetUrl() để ghép base URL; null -> placeholder/ẩn nút.

/** Bài Gọi tên: nhìn ảnh, nói tên. */
export interface NamingContent {
  exercise_type: 'naming';
  image_url: string | null;
  prompt: string;
  vocab_audio_url: string | null; // audio vocab chưa có dữ liệu -> luôn null hiện tại
}

/** 1 lựa chọn bài Nghe và đoán (recognition) — KHÔNG có cờ đúng/sai. */
export interface RecognitionChoice {
  vocab_id: string;
  image_url: string | null;
  word: string;
}

/** Bài Nghe và đoán, mode recognition: nghe câu hỏi, chạm chọn 1 trong 4 ô. */
export interface CommandRecognitionContent {
  exercise_type: 'command_identification';
  mode: 'recognition';
  command_audio_url: string | null;
  command_text: string;
  choices: RecognitionChoice[];
}

/** Bài Nghe và đoán, mode repetition: nghe câu hỏi + nhìn ảnh, nói to từ đó. */
export interface CommandRepetitionContent {
  exercise_type: 'command_identification';
  mode: 'repetition';
  command_audio_url: string | null;
  image_url: string | null;
  prompt: string;
}

/** Bài Hoàn thành câu: nhìn template + ảnh gợi ý, nói cả câu. */
export interface SentenceBuildingContent {
  exercise_type: 'sentence_building';
  template_display: string;
  image_url: string | null;
  sentence_audio_url: string | null;
  prompt: string;
}

export type AssignmentContent =
  | NamingContent
  | CommandRecognitionContent
  | CommandRepetitionContent
  | SentenceBuildingContent;

// ── 4. Attempts ─────────────────────────────────────────────────────────────

/** GET /exercises/{exercise_id} — response (KHÔNG lộ đáp án). mode có thể null. */
export interface ExerciseInfoResponse {
  exercise_id: string;
  exercise_type: string;
  topic: string;
  vocab_level: number;
  mode: string | null;
}

/** 1 câu nhận xét có phân loại cho màn Kết quả bài tập. */
export interface FeedbackItem {
  type: 'ok' | 'warn'; // ok = tô xanh (làm đúng), warn = tô vàng/đỏ (cần cải thiện/lỗi input)
  text: string;
}

/** POST /assignments/{assignment_id}/submit — response (khớp AttemptSubmitResponse). */
export interface AttemptSubmitResponse {
  score: number | null;
  /** 3 tiêu chí RIÊNG lượt này (cùng công thức attempt_to_metrics với /patients/me/stats). */
  accuracy_score: number | null;   // = score; null với bài touch / input invalid
  // ĐỘ PHỦ NỘI DUNG của lượt (recall, 0-100, có thể null): SEN=% từ khuyết nói được (điểm lẻ),
  // NAM/repetition=0/100, touch=100 nếu chọn đúng, invalid=null. KHÁC "Hoàn thành tuần" ở dashboard.
  completion_score: number | null;
  fluency_score: number | null;    // components.fluency; null với recognition/invalid
  result: string;
  /** Câu nhận xét có phân loại (ưu tiên dùng cái này cho UI mới). */
  feedback: FeedbackItem[];
  /** Bản rút gọn text (= feedback[].text) — giữ tương thích code cũ. */
  feedback_messages: string[];
  transcript: string | null;
  attempt_number: number;
  is_final: boolean;
  /** true khi lượt bài này vừa làm bệnh nhân lên vocab level (3 lần liên tiếp >=80 cùng topic). */
  leveled_up: boolean;
  /** Level mới (2 hoặc 3) khi leveled_up=true; null khi không lên level. */
  new_level: number | null;
}

// ── Chung ───────────────────────────────────────────────────────────────────

/** Mọi lỗi backend trả về dạng { detail: "..." }. */
export interface ApiError {
  detail: string;
}

// ── Hồ sơ bệnh nhân — GET /patients/me/profile (màn Tài khoản) ───────────────
export interface PatientProfile {
  full_name: string;
  email: string;
  phone_number: string | null;
  date_of_birth: string; // YYYY-MM-DD
  gender: string; // male | female | other
  severity_level: string | null;
  aphasia_type: string | null;
  hospital_name: string | null;
}
