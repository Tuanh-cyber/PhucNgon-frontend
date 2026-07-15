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
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  const sessionSuffix = session ? '&session=1' : '';

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
              style={[styles.option, isMixed && styles.optionMixed]}
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
      </ScrollView>

      <BottomNav active="exercises" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
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
