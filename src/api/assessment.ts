/**
 * API Assessment: kết quả đánh giá ban đầu.
 * Khớp docs/API_CONTRACT.md phần 2.
 */

import { apiClient } from './client';
import type { InitialAssessmentResponse, RecommendedExercise } from '@/src/types/api';

/** GET /patients/me/initial-assessment */
export async function getInitialAssessment(): Promise<InitialAssessmentResponse> {
  const res = await apiClient.get<InitialAssessmentResponse>(
    '/patients/me/initial-assessment',
  );
  return res.data;
}

/** GET /patients/me/recommended-exercises — gợi ý 3 loại bài theo profile bệnh. */
export async function getRecommendedExercises(): Promise<RecommendedExercise[]> {
  const res = await apiClient.get<RecommendedExercise[]>(
    '/patients/me/recommended-exercises',
  );
  return res.data;
}
