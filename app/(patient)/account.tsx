/**
 * Màn TÀI KHOẢN app bệnh nhân — danh sách mục kiểu app phổ biến:
 *   1. Thông tin tài khoản (THẬT) <- GET /patients/me/profile (họ tên, email, SĐT,
 *      ngày sinh, giới tính, mức độ, aphasia/bệnh viện nếu có). Chỉ xem.
 *   2. Đổi mật khẩu (THẬT) -> POST /auth/change-password; validate client: mật khẩu
 *      mới >= 6 ký tự + nhập lại khớp; 400 -> "Mật khẩu hiện tại không đúng".
 *   3. Stub "Sắp có": Thông báo / Trợ giúp & hỗ trợ / Điều khoản & Chính sách.
 *   4. Về ứng dụng: tên + phiên bản (đọc từ app.json qua expo-constants).
 *   5. Đăng xuất (đỏ, cuối danh sách) — bấm 1 lần hiện XÁC NHẬN inline (Alert của RN
 *      không hoạt động trên web nên dùng confirm 2 bước, chạy cả mobile lẫn web).
 */

import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { changePassword } from '@/src/api/auth';
import { getMyProfile } from '@/src/api/stats';
import { BottomNav } from '@/src/components/BottomNav';
import { useAuth } from '@/src/context/AuthContext';
import type { PatientProfile } from '@/src/types/api';

const GREEN = '#2E7D32';
const RED = '#D64545';

const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };

function formatDob(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export default function AccountScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  // ── 1. Hồ sơ ──
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((p) => active && setProfile(p))
      .catch(() => active && setProfileError(true));
    return () => {
      active = false;
    };
  }, []);

  // ── 2. Đổi mật khẩu ──
  const [showPwForm, setShowPwForm] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [rePw, setRePw] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onChangePassword() {
    setPwMessage(null);
    if (!curPw || !newPw || !rePw) {
      setPwMessage({ ok: false, text: 'Vui lòng điền đủ 3 ô.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMessage({ ok: false, text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (newPw !== rePw) {
      setPwMessage({ ok: false, text: 'Mật khẩu nhập lại không khớp.' });
      return;
    }
    setPwSubmitting(true);
    try {
      await changePassword({ current_password: curPw, new_password: newPw });
      setPwMessage({ ok: true, text: '✅ Đổi mật khẩu thành công.' });
      setCurPw('');
      setNewPw('');
      setRePw('');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setPwMessage({ ok: false, text: 'Mật khẩu hiện tại không đúng.' });
      } else {
        setPwMessage({ ok: false, text: 'Không đổi được mật khẩu. Vui lòng thử lại.' });
      }
    } finally {
      setPwSubmitting(false);
    }
  }

  // ── 5. Đăng xuất (xác nhận 2 bước — Alert không chạy trên web) ──
  const [confirmLogout, setConfirmLogout] = useState(false);

  async function onLogout() {
    await logout();
    router.replace('/');
  }

  const appName = Constants.expoConfig?.name ?? 'PhụcNgôn';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>👤 Tài khoản</Text>

        {/* ── 1. Thông tin tài khoản ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin tài khoản</Text>
          {profileError ? (
            <Text style={styles.muted}>Không tải được hồ sơ. Vui lòng thử lại sau.</Text>
          ) : !profile ? (
            <ActivityIndicator color={GREEN} />
          ) : (
            <>
              <InfoRow label="Họ và tên" value={profile.full_name} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Số điện thoại" value={profile.phone_number ?? '—'} />
              <InfoRow label="Ngày sinh" value={formatDob(profile.date_of_birth)} />
              <InfoRow label="Giới tính" value={GENDER_LABEL[profile.gender] ?? profile.gender} />
              {profile.severity_level ? (
                <InfoRow label="Mức độ" value={profile.severity_level} />
              ) : null}
              {profile.aphasia_type ? (
                <InfoRow label="Loại aphasia" value={profile.aphasia_type} />
              ) : null}
              {profile.hospital_name ? (
                <InfoRow label="Bệnh viện" value={profile.hospital_name} />
              ) : null}
            </>
          )}
        </View>

        {/* ── 2. Đổi mật khẩu ── */}
        <View style={styles.card}>
          <Pressable style={styles.rowBtn} onPress={() => setShowPwForm((v) => !v)}>
            <Text style={styles.rowBtnText}>🔒 Đổi mật khẩu</Text>
            <Text style={styles.chevron}>{showPwForm ? '⌄' : '›'}</Text>
          </Pressable>
          {showPwForm ? (
            <View style={styles.pwForm}>
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu hiện tại"
                placeholderTextColor="#999"
                secureTextEntry
                value={curPw}
                onChangeText={setCurPw}
              />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                placeholderTextColor="#999"
                secureTextEntry
                value={newPw}
                onChangeText={setNewPw}
              />
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#999"
                secureTextEntry
                value={rePw}
                onChangeText={setRePw}
              />
              {pwMessage ? (
                <Text style={[styles.pwMsg, { color: pwMessage.ok ? GREEN : RED }]}>
                  {pwMessage.text}
                </Text>
              ) : null}
              <Pressable
                style={[styles.pwBtn, pwSubmitting && styles.disabled]}
                onPress={onChangePassword}
                disabled={pwSubmitting}
              >
                {pwSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.pwBtnText}>Xác nhận đổi mật khẩu</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* ── 3. Stub "Sắp có" ── */}
        <View style={styles.card}>
          <StubRow icon="🔔" label="Thông báo" />
          <StubRow icon="❓" label="Trợ giúp & hỗ trợ" />
          <StubRow icon="📄" label="Điều khoản & Chính sách" last />
        </View>

        {/* ── 4. Về ứng dụng ── */}
        <View style={styles.card}>
          <InfoRow label="Ứng dụng" value={appName} />
          <InfoRow label="Phiên bản" value={appVersion} />
        </View>

        {/* ── 5. Đăng xuất (xác nhận trước) ── */}
        <View style={styles.card}>
          {!confirmLogout ? (
            <Pressable style={styles.rowBtn} onPress={() => setConfirmLogout(true)}>
              <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>Bạn chắc chắn muốn đăng xuất?</Text>
              <View style={styles.confirmRow}>
                <Pressable style={styles.cancelBtn} onPress={() => setConfirmLogout(false)}>
                  <Text style={styles.cancelText}>Hủy</Text>
                </Pressable>
                <Pressable style={styles.logoutBtn} onPress={onLogout}>
                  <Text style={styles.logoutBtnText}>Đăng xuất</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNav active="account" />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StubRow({ icon, label, last }: { icon: string; label: string; last?: boolean }) {
  return (
    <View style={[styles.stubRow, !last && styles.stubRowBorder]}>
      <Text style={styles.rowBtnText}>
        {icon} {label}
      </Text>
      <Text style={styles.stubBadge}>Sắp có</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  body: { padding: 20, gap: 14, paddingBottom: 28 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#222' },

  card: {
    backgroundColor: '#faf9fd',
    borderWidth: 1,
    borderColor: '#eceaf4',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  muted: { fontSize: 14, color: '#777' },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: { fontSize: 15, color: '#666' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#222', flexShrink: 1, textAlign: 'right' },

  rowBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBtnText: { fontSize: 16, fontWeight: '600', color: '#222' },
  chevron: { fontSize: 20, color: GREEN, fontWeight: 'bold' },

  pwForm: { gap: 10, marginTop: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  pwMsg: { fontSize: 14, fontWeight: '600' },
  pwBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  pwBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },

  stubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  stubRowBorder: { borderBottomWidth: 1, borderBottomColor: '#eee7fb' },
  stubBadge: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#efecf7',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },

  logoutText: { fontSize: 16, fontWeight: 'bold', color: RED },
  confirmBox: { gap: 12 },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#222' },
  confirmRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#bbb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#555' },
  logoutBtn: {
    flex: 1,
    backgroundColor: RED,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
