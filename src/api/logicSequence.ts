/**
 * API dạng bài Sắp xếp hình ảnh (logic_sequence) — /logic-sequence/*.
 * KHÔNG ASR/audio ghi âm — nộp bằng danh sách step_id theo thứ tự bệnh nhân chạm.
 */

import { apiClient } from './client';
import type { LogicSequenceContent, LogicSequenceSubmitResponse } from '@/src/types/api';

/** GET /logic-sequence/{id} — ảnh đã xáo ở server (gọi lại = xáo lại, dùng cho "Làm lại"). */
export async function getLogicSequenceContent(
  exerciseId: string,
): Promise<LogicSequenceContent> {
  const res = await apiClient.get<LogicSequenceContent>(`/logic-sequence/${exerciseId}`);
  return res.data;
}

/** POST /logic-sequence/{id}/submit — chấm nhị phân; kèm phiên nếu đang trong phiên. */
export async function submitLogicSequence(
  exerciseId: string,
  orderedStepIds: string[],
  therapySessionId?: string,
): Promise<LogicSequenceSubmitResponse> {
  const res = await apiClient.post<LogicSequenceSubmitResponse>(
    `/logic-sequence/${exerciseId}/submit`,
    { ordered_step_ids: orderedStepIds, therapy_session_id: therapySessionId ?? null },
  );
  return res.data;
}
