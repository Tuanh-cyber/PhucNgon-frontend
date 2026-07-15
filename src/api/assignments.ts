/**
 * API Assignments: danh sách bài theo loại + nội dung chi tiết 1 bài + nộp bài.
 *
 * Backend đã có đủ endpoint thật (không còn mock):
 *   - GET /plans/me/assignments?type=...   -> PlanAssignment[]
 *   - GET /assignments/{id}/content        -> AssignmentContent (không lộ đáp án)
 *   - POST /assignments/{id}/submit        -> qua submitAttempt() (src/api/attempts.ts)
 */

import type {
  AssignmentContent,
  AttemptSubmitResponse,
  PlanAssignment,
} from '@/src/types/api';
import { apiClient } from './client';
import { submitAttempt, type AudioFile } from './attempts';

/**
 * GET /plans/me/assignments?type={type}&topic={topic} — danh sách bài thật.
 * - type: 1 dạng cụ thể (sắp theo order_index) hoặc "mixed" (cả 3 dạng, backend
 *   trộn sẵn — cùng ngày gọi lại thứ tự không đổi).
 * - topic: optional; luồng chọn bài mới luôn truyền (chọn chủ đề TRƯỚC).
 */
export async function getAssignments(
  exerciseType: string,
  topic?: string,
): Promise<PlanAssignment[]> {
  const res = await apiClient.get<PlanAssignment[]>('/plans/me/assignments', {
    params: topic ? { type: exerciseType, topic } : { type: exerciseType },
  });
  return res.data;
}

/** Alias cũ — màn exercises.tsx/exercise-detail.tsx cũ gọi tên này. */
export const getAssignmentsByType = getAssignments;

/** GET /assignments/{id}/content — nội dung render UI của 1 bài (ảnh/audio/choices). */
export async function getAssignmentContent(
  assignmentId: string,
): Promise<AssignmentContent> {
  const res = await apiClient.get<AssignmentContent>(
    `/assignments/${assignmentId}/content`,
  );
  return res.data;
}

/** Nộp bài speech (naming / repetition / sentence_building): gửi audio. */
export async function submitAssignmentAudio(
  assignmentId: string,
  audioFile: AudioFile,
  therapySessionId?: string, // optional: gắn lượt làm vào PHIÊN (rule.md mục 3)
): Promise<AttemptSubmitResponse> {
  return submitAttempt(assignmentId, { audioFile, therapySessionId });
}

/** Nộp bài Nghe và đoán (recognition): gửi vocab_id đã chọn, KHÔNG gửi audio. */
export async function submitAssignmentChoice(
  assignmentId: string,
  selectedVocabId: string,
  therapySessionId?: string, // optional: gắn lượt làm vào PHIÊN (rule.md mục 3)
): Promise<AttemptSubmitResponse> {
  return submitAttempt(assignmentId, { selectedVocabId, therapySessionId });
}
