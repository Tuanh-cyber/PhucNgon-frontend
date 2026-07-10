/**
 * Layout web BÁC SĨ — khung dashboard desktop (bám 2 mockup):
 *   - Sidebar trái: PHỤC NGÔN + menu (Tổng quan, Bệnh nhân hoạt động; Bài tập/Báo cáo/
 *     Lịch hẹn là stub "Sắp có").
 *   - Topbar: tiêu đề + avatar (initials tên bác sĩ) + Đăng xuất.
 *   - Nội dung: <Slot /> của expo-router.
 *
 * GUARD: chỉ role=therapist được vào — user null -> /(auth)/login; role khác -> về app
 * bệnh nhân (KHÔNG đổi hành vi bệnh nhân). Backend vẫn là lớp phân quyền thật (mask),
 * guard này chỉ là UX.
 *
 * Primitive RN thuần (View/Pressable/ScrollView) -> chạy cả web lẫn mobile; ưu tiên
 * desktop, màn nhỏ sidebar co lại (chỉ icon) chứ không crash.
 */

import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/src/context/AuthContext';

const GREEN = '#2E7D32';
const SIDEBAR_BG = '#1B5E3A';
const ACTIVE_BG = '#2E7D32';

const MENU: { key: string; icon: string; label: string; href: string; stub?: boolean }[] = [
  { key: 'overview', icon: '📊', label: 'Tổng quan', href: '/(doctor)' },
  { key: 'patients', icon: '🧑‍⚕️', label: 'Bệnh nhân', href: '/(doctor)/patients' },
  { key: 'exercises', icon: '📝', label: 'Bài tập', href: '/(doctor)/stub?title=Bài tập', stub: true },
  { key: 'reports', icon: '📄', label: 'Báo cáo', href: '/(doctor)/stub?title=Báo cáo', stub: true },
  { key: 'schedule', icon: '📅', label: 'Lịch hẹn', href: '/(doctor)/stub?title=Lịch hẹn', stub: true },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const chars = (parts.length >= 2 ? [parts[0][0], parts[parts.length - 1][0]] : [name[0] ?? '?']);
  return chars.join('').toUpperCase();
}

export default function DoctorLayout() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const compact = width < 900; // màn hẹp -> sidebar chỉ icon

  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'therapist') return <Redirect href="/(patient)/home" />;

  async function onLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  function isActive(item: (typeof MENU)[number]): boolean {
    if (item.key === 'overview') return pathname === '/' || pathname === '';
    if (item.key === 'patients') return pathname.startsWith('/patients');
    return item.stub === true && pathname.startsWith('/stub');
  }

  return (
    <View style={styles.shell}>
      {/* ── Sidebar ── */}
      <View style={[styles.sidebar, compact && styles.sidebarCompact]}>
        <Text style={styles.brand}>{compact ? 'PN' : 'PHỤC NGÔN'}</Text>
        {!compact && <Text style={styles.brandSub}>Web bác sĩ</Text>}
        <View style={styles.menu}>
          {MENU.map((m) => (
            <Pressable
              key={m.key}
              style={[styles.menuItem, isActive(m) && styles.menuItemActive]}
              onPress={() => router.push(m.href as never)}
            >
              <Text style={styles.menuIcon}>{m.icon}</Text>
              {!compact && (
                <Text style={styles.menuLabel}>
                  {m.label}
                  {m.stub ? ' ·' : ''}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Cột phải: topbar + nội dung ── */}
      <View style={styles.main}>
        <View style={styles.topbar}>
          <Text style={styles.topTitle}>Bảng điều khiển</Text>
          <View style={styles.topRight}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(user.full_name)}</Text>
            </View>
            {!compact && <Text style={styles.doctorName}>{user.full_name}</Text>}
            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: '#f4f6f4' },

  sidebar: { width: 230, backgroundColor: SIDEBAR_BG, paddingVertical: 24, paddingHorizontal: 14 },
  sidebarCompact: { width: 64, paddingHorizontal: 8 },
  brand: { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
  brandSub: { color: '#a5d6b7', fontSize: 13, textAlign: 'center', marginTop: 2 },
  menu: { marginTop: 28, gap: 6 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  menuItemActive: { backgroundColor: ACTIVE_BG },
  menuIcon: { fontSize: 18 },
  menuLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },

  main: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e9e5',
  },
  topTitle: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  doctorName: { fontSize: 15, fontWeight: '600', color: '#333' },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#d64545',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  logoutText: { color: '#d64545', fontWeight: '600', fontSize: 14 },

  content: { flex: 1 },
});
