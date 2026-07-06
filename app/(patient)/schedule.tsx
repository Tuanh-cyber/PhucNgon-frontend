/**
 * Lịch hẹn — placeholder (chưa có API lịch hẹn; sẽ làm khi có thiết kế + backend).
 */

import { StyleSheet, Text, View } from 'react-native';

import { BottomNav } from '@/src/components/BottomNav';

export default function ScheduleScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.title}>Lịch hẹn</Text>
        <Text style={styles.note}>Tính năng đang phát triển.</Text>
      </View>
      <BottomNav active="schedule" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  body: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: 'bold' },
  note: { fontSize: 15, color: '#888' },
});
