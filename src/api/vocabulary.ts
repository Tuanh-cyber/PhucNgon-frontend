/**
 * API từ vựng — GET /vocabulary (màn flashcard "Học từ vựng").
 * Trả toàn bộ 90 từ (hoặc lọc theo topic), mỗi từ kèm image_url + audio_url
 * (đường dẫn tương đối /static/... — ghép base bằng buildAssetUrl khi hiển thị).
 */

import { apiClient } from './client';
import type { VocabularyItem } from '@/src/types/api';

export async function getVocabulary(topic?: string): Promise<VocabularyItem[]> {
  const res = await apiClient.get<VocabularyItem[]>('/vocabulary', {
    params: topic ? { topic } : undefined,
  });
  return res.data;
}
