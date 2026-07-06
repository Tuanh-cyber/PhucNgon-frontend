/**
 * API Attempts: làm bài / nộp bài.
 * Khớp docs/API_CONTRACT.md phần 4.
 */

import { apiClient } from './client';
import type { AttemptSubmitResponse, ExerciseInfoResponse } from '@/src/types/api';

/** GET /exercises/{exercise_id} — thông tin cơ bản 1 bài (KHÔNG lộ đáp án). */
export async function getExerciseInfo(
  exerciseId: string,
): Promise<ExerciseInfoResponse> {
  const res = await apiClient.get<ExerciseInfoResponse>(`/exercises/${exerciseId}`);
  return res.data;
}

/**
 * File ghi âm để nộp bài. Hình dạng khác nhau theo nền tảng:
 *   - Mobile: { uri, name, type } (RN FormData file).
 *   - Web: 1 Blob/File.
 */
export type AudioFile =
  | { uri: string; name: string; type: string }
  | Blob;

export interface SubmitAttemptParams {
  /** optional — không cần cho bài command_identification/recognition. */
  audioFile?: AudioFile;
  /** optional — chỉ dùng cho command_identification/recognition. */
  selectedVocabId?: string;
}

/**
 * POST /assignments/{assignment_id}/submit — multipart form-data.
 * Trả AttemptSubmitResponse. Có thể ném 422 (lỗi audio) / 403 (bài không phải của mình).
 */
export async function submitAttempt(
  assignmentId: string,
  params: SubmitAttemptParams,
): Promise<AttemptSubmitResponse> {
  const form = new FormData();
  if (params.audioFile !== undefined) {
    // Ép any vì kiểu FormData của RN khác web nhưng cùng append được.
    form.append('audio_file', params.audioFile as any);
  }
  if (params.selectedVocabId !== undefined) {
    form.append('selected_vocab_id', params.selectedVocabId);
  }

  const res = await apiClient.post<AttemptSubmitResponse>(
    `/assignments/${assignmentId}/submit`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}
