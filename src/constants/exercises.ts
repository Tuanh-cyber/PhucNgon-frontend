/**
 * Tên hiển thị + icon cho 3 loại bài — DÙNG CHUNG toàn app, KHÔNG hardcode rải rác.
 *
 * LƯU Ý: backend /plans/me/today vẫn trả display_name cũ ("Lặp lại", "Tạo câu") — frontend
 * BỎ QUA field đó và dùng map này (tên mới đã chốt: "Nghe và đoán", "Hoàn thành câu").
 */

export const EXERCISE_DISPLAY_NAME: Record<string, string> = {
  naming: 'Gọi tên',
  command_identification: 'Nghe và đoán',
  sentence_building: 'Hoàn thành câu',
};

export const EXERCISE_ICON: Record<string, string> = {
  naming: '🎤',
  command_identification: '🔁',
  sentence_building: '✏️',
};

/** Tên hiển thị của 1 loại bài; fallback về chính exercise_type nếu chưa có trong map. */
export function exerciseDisplayName(exerciseType: string): string {
  return EXERCISE_DISPLAY_NAME[exerciseType] ?? exerciseType;
}

/**
 * Tên hiển thị topic (đồng bộ TOPIC_DISPLAY_NAME backend app/schemas/plan.py).
 * API /plans/me/topics đã trả topic_display, map này dùng cho màn chỉ có enum value
 * trên query param (exercise-list).
 */
export const TOPIC_DISPLAY_NAME: Record<string, string> = {
  daily_activity: 'Hoạt động thường ngày',
  food_drink: 'Ăn uống',
  household_item: 'Vật dụng',
  family: 'Gia đình',
  body_part: 'Bộ phận cơ thể',
  number: 'Số đếm',
};

export function topicDisplayName(topic: string): string {
  return TOPIC_DISPLAY_NAME[topic] ?? topic;
}

/** Icon cho từng topic (màn "Chọn chủ đề"). */
export const TOPIC_ICON: Record<string, string> = {
  daily_activity: '🏃',
  food_drink: '🍚',
  household_item: '🪑',
  family: '👪',
  body_part: '💪',
  number: '🔢',
};
