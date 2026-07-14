/**
 * Bottom navigation dùng chung cho các màn bệnh nhân — row 4 mục đơn giản
 * (KHÔNG dùng tab navigator phức tạp, theo phạm vi đã chốt):
 *   Trang chủ / Bài tập / Lịch / Tài khoản.
 *
 * "Đăng xuất" đã chuyển VÀO màn Tài khoản (cuối danh sách, có bước xác nhận) —
 * tab 👤 giờ mở màn Tài khoản thay vì logout thẳng (an toàn hơn cho người lớn tuổi).
 * "Bài tập" mở luồng chọn bài 3 bước (chọn dạng -> chọn chủ đề -> danh sách bài).
 *
 * active: đánh dấu mục thuộc màn hiện tại.
 */

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const GREEN = '#2E7D32';

export type NavKey = 'home' | 'exercises' | 'schedule' | 'account';

const ITEMS: { key: NavKey; icon: string; label: string; href: string }[] = [
  { key: 'home', icon: '🏠', label: 'Trang chủ', href: '/(patient)/home' },
  { key: 'exercises', icon: '✏️', label: 'Bài tập', href: '/(patient)/select-type' },
  { key: 'schedule', icon: '📅', label: 'Lịch', href: '/(patient)/schedule' },
  { key: 'account', icon: '👤', label: 'Tài khoản', href: '/(patient)/account' },
];

export function BottomNav({ active }: { active: NavKey }) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      {ITEMS.map((it) => {
        const isActive = it.key === active;
        return (
          <Pressable
            key={it.key}
            style={[styles.item, isActive && styles.itemActive]}
            onPress={() => {
              if (!isActive) router.push(it.href as never);
            }}
          >
            <Text style={styles.icon}>{it.icon}</Text>
            <Text style={isActive ? styles.labelActive : styles.label}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  item: { alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4 },
  itemActive: { backgroundColor: '#E7F5E9', borderRadius: 12 },
  icon: { fontSize: 20 },
  label: { fontSize: 11, color: '#666' },
  labelActive: { fontSize: 11, color: GREEN, fontWeight: 'bold' },
});
