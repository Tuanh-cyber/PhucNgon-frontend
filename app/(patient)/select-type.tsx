/**
 * Bước 1/3 luồng chọn bài — "Chọn dạng bài tập" (= CHỌN MODE của rule.md).
 *
 * 4 lựa chọn lớn: Gọi tên / Nghe và đoán / Hoàn thành câu / Trộn cả 3 dạng (type="mixed").
 * Bấm 1 lựa chọn -> /(patient)/select-topic?type={type} (chọn chủ đề TRƯỚC khi ra bài).
 *
 * ?session=1 (LUỒNG PHIÊN rule.md — vào từ nút chính trang chủ): cờ được chuyển tiếp
 * sang select-topic; ở đó chọn topic sẽ POST /sessions/start thay vì mở danh sách bài.
 * KHÔNG có cờ -> luồng cũ y nguyên (tab "Bài tập" của BottomNav vẫn đi lối cũ).
 *
 * Style: nút to, chữ to, tương phản cao — người lớn tuổi dễ bấm.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { startSession } from '@/src/api/sessions';
import { BottomNav } from '@/src/components/BottomNav';

const GREEN = '#2E7D32';
const PURPLE = '#7C4DFF';

const OPTIONS: { type: string; icon: string; title: string; subtitle: string }[] = [
  { type: 'naming', icon: '🎤', title: 'Gọi tên', subtitle: 'Nhìn ảnh và nói tên' },
  {
    type: 'command_identification',
    icon: '🔁',
    title: 'Nghe và đoán',
    subtitle: 'Nghe câu hỏi rồi chọn hoặc nói',
  },
  {
    type: 'sentence_building',
    icon: '✏️',
    title: 'Hoàn thành câu',
    subtitle: 'Nói to cả câu hoàn chỉnh',
  },
  {
    type: 'mixed',
    icon: '🎲',
    title: 'Trộn cả 3 dạng',
    subtitle: 'Đổi dạng liên tục cho đỡ nhàm',
  },
];

export default function SelectTypeScreen() {
  const router = useRouter();
  const { session } = useLocalSearchParams<{ session?: string }>();
  const isSessionFlow = session === '1';
  const sessionSuffix = session ? '&session=1' : '';
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Mode "Sắp xếp hình ảnh": KHÔNG qua chọn topic — start phiên ngay rồi vào runner riêng. */
  async function onPickLogicSequence() {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const s = await startSession('logic_sequence');
      if (s.exercises.length === 0) {
        setError('Chưa có bài sắp xếp nào.');
        return;
      }
      const ids = s.exercises.map((e) => e.exercise_id).join(',');
      router.replace(
        `/(patient)/logic-sequence-exercise?sid=${s.session_id}&ids=${ids}&index=0`,
      );
    } catch {
      setError('Không bắt đầu được phiên. Vui lòng thử lại.');
    } finally {
      setStarting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Chọn dạng bài tập</Text>
        <Text style={styles.subtitle}>Bước 1/3 — Bạn muốn luyện dạng nào?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {OPTIONS.map((o) => {
          const isMixed = o.type === 'mixed';
          return (
            <Pressable
              key={o.type}
              style={[styles.option, isMixed && styles.optionMixed, starting && styles.optionDisabled]}
              disabled={starting}
              onPress={() =>
                router.push(`/(patient)/select-topic?type=${o.type}${sessionSuffix}`)
              }
            >
              <Text style={styles.optionIcon}>{o.icon}</Text>
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, isMixed && styles.optionTitleMixed]}>
                  {o.title}
                </Text>
                <Text style={styles.optionSubtitle}>{o.subtitle}</Text>
              </View>
              <Text style={[styles.chevron, isMixed && styles.optionTitleMixed]}>›</Text>
            </Pressable>
          );
        })}

        {/* Dạng SẮP XẾP HÌNH ẢNH — CHỈ ở luồng phiên (modality riêng, không có luồng
            danh sách cũ). Bấm -> start phiên NGAY, BỎ QUA bước chọn topic. */}
        {isSessionFlow ? (
          <Pressable
            style={[styles.option, styles.optionSequence, starting && styles.optionDisabled]}
            disabled={starting}
            onPress={onPickLogicSequence}
          >
            <Text style={styles.optionIcon}>🖼️</Text>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, styles.optionTitleSequence]}>
                Sắp xếp hình ảnh
              </Text>
              <Text style={styles.optionSubtitle}>Chạm ảnh theo đúng trình tự hành động</Text>
            </View>
            {starting ? (
              <ActivityIndicator color="#1976D2" />
            ) : (
              <Text style={[styles.chevron, styles.optionTitleSequence]}>›</Text>
            )}
          </Pressable>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <BottomNav active="exercises" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  // Card 'Sắp xếp hình ảnh' — xanh dương phân biệt modality mới
  optionSequence: { borderWidth: 2, borderColor: '#1976D2', backgroundColor: '#E9F2FE' },
  optionTitleSequence: { color: '#1976D2' },
  optionDisabled: { opacity: 0.5 },
  error: { color: '#D64545', fontSize: 14, textAlign: 'center' },
  header: { padding: 20, gap: 6 },
  back: { fontSize: 16, color: GREEN, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: 'bold', marginTop: 6 },
  subtitle: { fontSize: 16, color: '#555' },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#E7F5E9',
    borderRadius: 16,
    padding: 20,
    borderBottomWidth: 4,
    borderBottomColor: '#bfdcc7',
  },
  optionMixed: {
    backgroundColor: '#EFE8FF',
    borderBottomColor: '#d4c5f5',
  },
  optionIcon: { fontSize: 34 },
  optionTextWrap: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 21, fontWeight: 'bold', color: GREEN },
  optionTitleMixed: { color: PURPLE },
  optionSubtitle: { fontSize: 15, color: '#555' },
  chevron: { fontSize: 30, color: GREEN, fontWeight: 'bold' },
});
