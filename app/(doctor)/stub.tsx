/**
 * Màn stub cho các mục sidebar chưa làm (Bài tập / Báo cáo / Lịch hẹn) — nhận ?title=.
 */

import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function DoctorStubScreen() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  return (
    <View style={styles.center}>
      <Text style={styles.icon}>🚧</Text>
      <Text style={styles.title}>{title ?? 'Tính năng'} — Sắp có</Text>
      <Text style={styles.sub}>Mục này sẽ được bổ sung trong phiên bản tới.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  icon: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  sub: { fontSize: 15, color: '#777' },
});
