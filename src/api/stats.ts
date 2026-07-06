/**
 * API Stats: 3 chỉ số tiến độ tính tự động từ lịch sử làm bài.
 *
 * Endpoint GET /patients/me/stats CÓ trong backend (app/routers/assessments.py, đã test)
 * nhưng chưa được ghi trong docs/API_CONTRACT.md.
 */

import { apiClient } from './client';
import type { PatientStatsResponse, ProgressDashboard } from '@/src/types/api';

/** GET /patients/me/stats */
export async function getMyStats(): Promise<PatientStatsResponse> {
  const res = await apiClient.get<PatientStatsResponse>('/patients/me/stats');
  return res.data;
}

/** GET /patients/me/progress-dashboard — dữ liệu dashboard trang chủ (biểu đồ/streak/từ hay sai). */
export async function getProgressDashboard(): Promise<ProgressDashboard> {
  const res = await apiClient.get<ProgressDashboard>('/patients/me/progress-dashboard');
  return res.data;
}
