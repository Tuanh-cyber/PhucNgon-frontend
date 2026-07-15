/**
 * API dạng bài Nhận diện màu sắc (color_recognition) — /color-recognition/*.
 * Nghe audio hỏi màu -> chạm 1 trong 4 ô màu (vẽ từ hex). Không ASR.
 */

import { apiClient } from './client';
import type {
  ColorRecognitionContent,
  ColorRecognitionSubmitResponse,
} from '@/src/types/api';

/** GET /color-recognition/{code} — 4 ô xáo ở server (gọi lại = bộ nhiễu/thứ tự khác). */
export async function getColorRecognitionContent(
  exerciseCode: string,
): Promise<ColorRecognitionContent> {
  const res = await apiClient.get<ColorRecognitionContent>(
    `/color-recognition/${exerciseCode}`,
  );
  return res.data;
}

/** POST /color-recognition/{code}/submit — chấm nhị phân; kèm phiên nếu có. */
export async function submitColorRecognition(
  exerciseCode: string,
  selectedColorId: string,
  therapySessionId?: string,
): Promise<ColorRecognitionSubmitResponse> {
  const res = await apiClient.post<ColorRecognitionSubmitResponse>(
    `/color-recognition/${exerciseCode}/submit`,
    { selected_color_id: selectedColorId, therapy_session_id: therapySessionId ?? null },
  );
  return res.data;
}
