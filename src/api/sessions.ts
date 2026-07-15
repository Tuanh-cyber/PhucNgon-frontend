/**
 * API phiên tập (rule.md mục 3: 1 phiên = 10 bài) — /sessions/*.
 * Tiến độ phiên LUÔN hỏi backend (GET) — frontend không tự đếm trong biến local.
 */

import { apiClient } from './client';
import type { SessionMode, SessionStartResponse, SessionState } from '@/src/types/api';

/** POST /sessions/start — topic bỏ trống = Mixed Topics. */
export async function startSession(
  mode: SessionMode,
  topic?: string,
): Promise<SessionStartResponse> {
  const res = await apiClient.post<SessionStartResponse>('/sessions/start', {
    mode,
    topic: topic ?? null,
  });
  return res.data;
}

/** GET /sessions/{id} — trạng thái + tiến độ x/10 (nguồn sự thật). */
export async function getSession(sessionId: string): Promise<SessionState> {
  const res = await apiClient.get<SessionState>(`/sessions/${sessionId}`);
  return res.data;
}

/** POST /sessions/{id}/finish — completed (đủ 10) | stopped_early (dừng sớm). */
export async function finishSession(sessionId: string): Promise<SessionState> {
  const res = await apiClient.post<SessionState>(`/sessions/${sessionId}/finish`);
  return res.data;
}
