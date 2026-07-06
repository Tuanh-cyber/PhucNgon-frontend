/**
 * API Plans: kế hoạch điều trị / bài tập hôm nay.
 * Khớp docs/API_CONTRACT.md phần 3.
 */

import { apiClient } from './client';
import type { TodayPlanResponse, TopicSummary } from '@/src/types/api';

/** GET /plans/me/today */
export async function getTodayPlan(): Promise<TodayPlanResponse> {
  const res = await apiClient.get<TodayPlanResponse>('/plans/me/today');
  return res.data;
}

/**
 * GET /plans/me/topics?type=... — các topic THẬT SỰ CÓ BÀI trong plan.
 * type: 1 dạng cụ thể, "mixed", hoặc bỏ trống (= cả 3 dạng).
 */
export async function getTopics(type?: string): Promise<TopicSummary[]> {
  const res = await apiClient.get<TopicSummary[]>('/plans/me/topics', {
    params: type ? { type } : {},
  });
  return res.data;
}
