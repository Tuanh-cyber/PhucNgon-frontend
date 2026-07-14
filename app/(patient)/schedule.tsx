/**
 * Tab LỊCH app bệnh nhân — giao diện kiểu Google Calendar (bám ảnh tham khảo):
 *
 * MÀN RỘNG (>=900px):
 *   - Sidebar trái: lịch THÁNG (tiêu đề "Tháng M, YYYY" + mũi tên; grid CN-T7; HÔM NAY
 *     khoanh tròn; ngày CÓ LỊCH HẸN chấm xanh; bấm ngày -> tuần chứa ngày đó hiện bên phải).
 *   - Khung chính: lịch TUẦN cột ngày + trục giờ — mỗi lịch hẹn là khối màu đặt đúng khung
 *     giờ (tên bác sĩ / địa điểm / giờ / phòng); bấm khối -> popup chi tiết (Modal).
 *   - Nút "Hôm nay" + mũi tên chuyển tuần.
 * MÀN HẸP (<900px): lịch tháng thu gọn (collapse được) + DANH SÁCH lịch hẹn của tuần đang
 *   chọn (không ép grid tuần vào màn hẹp).
 *
 * DỮ LIỆU: GET /patients/me/appointments?from=&to= — gọi theo cửa sổ THÁNG ĐANG XEM ±1
 * (phủ cả tuần vắt tháng). Giờ UTC từ backend -> new Date() tự ra giờ máy.
 * Lỗi KHÔNG xóa dữ liệu đang hiện (pattern cờ active + giữ state cũ).
 */

import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { getMyAppointments } from '@/src/api/appointments';
import { BottomNav } from '@/src/components/BottomNav';
import type { AppointmentItem } from '@/src/types/api';

const GREEN = '#2E7D32';
const BLOCK_BG = '#D6E9FF';
const BLOCK_BORDER = '#1976D2';
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; // Chủ nhật đứng đầu (như Google)

// Trục giờ khung tuần: 6h -> 20h
const HOUR_START = 6;
const HOUR_END = 20;
const HOUR_HEIGHT = 52; // px / giờ

// ── Date helpers (mọi tính toán theo GIỜ MÁY — backend trả UTC, Date tự quy đổi) ──
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - r.getDay()); // getDay(): 0=CN -> tuần bắt đầu Chủ nhật
  return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function sameDay(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b);
}

export default function ScheduleScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const today = new Date();

  // Ngày đang chọn (quyết định TUẦN ở khung chính) + tháng sidebar đang xem
  const [selected, setSelected] = useState<Date>(today);
  const [monthCursor, setMonthCursor] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [monthOpen, setMonthOpen] = useState(true); // mobile: collapse lịch tháng

  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AppointmentItem | null>(null); // popup

  // ── Dữ liệu: tải theo cửa sổ tháng đang xem ±1 (phủ tuần vắt tháng) ──
  const monthKey = `${monthCursor.getFullYear()}-${monthCursor.getMonth()}`;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      const from = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1);
      const to = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 2, 0);
      getMyAppointments(ymd(from), ymd(to))
        .then((d) => {
          if (!active) return;
          setItems(d);
          setError(null);
        })
        .catch(() => {
          if (!active) return;
          setError('Không tải được lịch hẹn.'); // KHÔNG xóa items đang có
        })
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthKey]),
  );

  // Map ngày (yyyy-mm-dd giờ máy) -> lịch hẹn trong ngày đó
  const byDay = useMemo(() => {
    const m = new Map<string, AppointmentItem[]>();
    for (const a of items) {
      const k = ymd(new Date(a.starts_at));
      const arr = m.get(k) ?? [];
      arr.push(a);
      m.set(k, arr);
    }
    for (const arr of m.values()) {
      arr.sort((x, y) => x.starts_at.localeCompare(y.starts_at));
    }
    return m;
  }, [items]);

  const weekStart = startOfWeek(selected);
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  function goWeek(delta: number) {
    const d = addDays(selected, delta * 7);
    setSelected(d);
    setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }
  function goToday() {
    setSelected(today);
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }
  function pickDay(d: Date) {
    setSelected(d);
    setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  const weekEvents = weekDays.flatMap((d) => byDay.get(ymd(d)) ?? []);

  return (
    <View style={styles.screen}>
      {/* ── Thanh điều khiển ── */}
      <View style={styles.topbar}>
        <Text style={styles.title}>📅 Lịch hẹn</Text>
        <View style={styles.controls}>
          <Pressable style={styles.todayBtn} onPress={goToday}>
            <Text style={styles.todayBtnText}>Hôm nay</Text>
          </Pressable>
          <Pressable style={styles.arrowBtn} onPress={() => goWeek(-1)} hitSlop={8}>
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Pressable style={styles.arrowBtn} onPress={() => goWeek(1)} hitSlop={8}>
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
          <Text style={styles.rangeLabel}>
            {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} –{' '}
            {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1}
          </Text>
          {loading ? <ActivityIndicator size="small" color={GREEN} /> : null}
        </View>
      </View>
      {error && items.length === 0 ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.layout, !isWide && styles.layoutNarrow]}>
        {/* ── Sidebar / khối lịch THÁNG ── */}
        <View style={[styles.monthPane, !isWide && styles.monthPaneNarrow]}>
          {!isWide ? (
            <Pressable style={styles.monthToggle} onPress={() => setMonthOpen((v) => !v)}>
              <Text style={styles.monthTitle}>
                Tháng {monthCursor.getMonth() + 1}, {monthCursor.getFullYear()}
              </Text>
              <Text style={styles.monthToggleIcon}>{monthOpen ? '⌄' : '›'}</Text>
            </Pressable>
          ) : null}
          {(isWide || monthOpen) && (
            <MonthCalendar
              cursor={monthCursor}
              selected={selected}
              today={today}
              hasEvents={(d) => byDay.has(ymd(d))}
              onPrev={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
              }
              onNext={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
              }
              onPick={pickDay}
              showTitle={isWide}
            />
          )}
        </View>

        {/* ── Khung chính ── */}
        {isWide ? (
          <WeekGrid
            weekDays={weekDays}
            today={today}
            selected={selected}
            byDay={byDay}
            onPressEvent={setDetail}
          />
        ) : (
          <WeekList weekDays={weekDays} events={weekEvents} onPressEvent={setDetail} />
        )}
      </View>

      {/* ── Popup chi tiết ── */}
      <Modal visible={detail !== null} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setDetail(null)}>
          {detail ? (
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <Text style={styles.modalDoctor}>👨‍⚕️ {detail.doctor_name}</Text>
              <Text style={styles.modalLine}>
                🕘 {hhmm(new Date(detail.starts_at))} – {hhmm(new Date(detail.ends_at))} ·{' '}
                {new Date(detail.starts_at).toLocaleDateString('vi-VN')}
              </Text>
              <Text style={styles.modalLine}>📍 {detail.location}</Text>
              {detail.room ? <Text style={styles.modalLine}>🚪 Phòng {detail.room}</Text> : null}
              {detail.note ? <Text style={styles.modalNote}>📝 {detail.note}</Text> : null}
              <Pressable style={styles.modalClose} onPress={() => setDetail(null)}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </Pressable>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>

      <BottomNav active="schedule" />
    </View>
  );
}

// ── Lịch tháng (sidebar) ──────────────────────────────────────────────────────
function MonthCalendar({
  cursor,
  selected,
  today,
  hasEvents,
  onPrev,
  onNext,
  onPick,
  showTitle,
}: {
  cursor: Date;
  selected: Date;
  today: Date;
  hasEvents: (d: Date) => boolean;
  onPrev: () => void;
  onNext: () => void;
  onPick: (d: Date) => void;
  showTitle: boolean;
}) {
  // Grid 6 tuần bắt đầu từ Chủ nhật của tuần chứa ngày 1
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = [...Array(42)].map((_, i) => addDays(gridStart, i));

  return (
    <View style={styles.month}>
      <View style={styles.monthHeader}>
        {showTitle ? (
          <Text style={styles.monthTitle}>
            Tháng {cursor.getMonth() + 1}, {cursor.getFullYear()}
          </Text>
        ) : (
          <View />
        )}
        <View style={styles.monthArrows}>
          <Pressable onPress={onPrev} hitSlop={8}>
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Pressable onPress={onNext} hitSlop={8}>
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.monthWeekdays}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.monthWeekday}>
            {w}
          </Text>
        ))}
      </View>

      {[...Array(6)].map((_, wi) => (
        <View key={wi} style={styles.monthRow}>
          {cells.slice(wi * 7, wi * 7 + 7).map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = sameDay(d, selected);
            return (
              <Pressable key={ymd(d)} style={styles.monthCell} onPress={() => onPick(d)}>
                <View
                  style={[
                    styles.monthDayWrap,
                    isToday && styles.monthToday,
                    isSelected && !isToday && styles.monthSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.monthDay,
                      !inMonth && styles.monthDayDim,
                      isToday && styles.monthDayToday,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                <View style={[styles.eventDot, !hasEvents(d) && styles.eventDotHidden]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Lịch tuần dạng grid (màn rộng) ────────────────────────────────────────────
function WeekGrid({
  weekDays,
  today,
  selected,
  byDay,
  onPressEvent,
}: {
  weekDays: Date[];
  today: Date;
  selected: Date;
  byDay: Map<string, AppointmentItem[]>;
  onPressEvent: (a: AppointmentItem) => void;
}) {
  const hours = [...Array(HOUR_END - HOUR_START + 1)].map((_, i) => HOUR_START + i);

  /** Vị trí khối theo giờ ĐỊA PHƯƠNG; clamp vào trục 6-20h. */
  function blockPos(a: AppointmentItem): { top: number; height: number } {
    const s = new Date(a.starts_at);
    const e = new Date(a.ends_at);
    const sH = Math.max(s.getHours() + s.getMinutes() / 60, HOUR_START);
    const eH = Math.min(e.getHours() + e.getMinutes() / 60 || HOUR_END, HOUR_END);
    return {
      top: (sH - HOUR_START) * HOUR_HEIGHT,
      height: Math.max((eH - sH) * HOUR_HEIGHT, 34),
    };
  }

  return (
    <View style={styles.weekPane}>
      {/* Hàng tiêu đề ngày */}
      <View style={styles.weekHeaderRow}>
        <View style={styles.hourGutter} />
        {weekDays.map((d) => {
          const isToday = sameDay(d, today);
          return (
            <View key={ymd(d)} style={styles.weekHeaderCell}>
              <Text style={styles.weekHeaderWd}>{WEEKDAYS[d.getDay()]}</Text>
              <View style={[styles.weekHeaderDayWrap, isToday && styles.monthToday]}>
                <Text style={[styles.weekHeaderDay, isToday && styles.monthDayToday]}>
                  {d.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <ScrollView>
        <View style={styles.weekBody}>
          {/* Trục giờ */}
          <View style={styles.hourGutter}>
            {hours.map((h) => (
              <View key={h} style={styles.hourCell}>
                <Text style={styles.hourLabel}>{h}:00</Text>
              </View>
            ))}
          </View>
          {/* 7 cột ngày */}
          {weekDays.map((d) => (
            <View
              key={ymd(d)}
              style={[styles.dayCol, sameDay(d, selected) && styles.dayColSelected]}
            >
              {hours.map((h) => (
                <View key={h} style={styles.hourSlot} />
              ))}
              {(byDay.get(ymd(d)) ?? []).map((a) => {
                const pos = blockPos(a);
                const s = new Date(a.starts_at);
                const e = new Date(a.ends_at);
                return (
                  <Pressable
                    key={a.appointment_id}
                    style={[styles.eventBlock, { top: pos.top, height: pos.height }]}
                    onPress={() => onPressEvent(a)}
                  >
                    <Text style={styles.eventDoctor} numberOfLines={1}>
                      {a.doctor_name}
                    </Text>
                    <Text style={styles.eventMeta} numberOfLines={1}>
                      {a.location}
                    </Text>
                    <Text style={styles.eventMeta} numberOfLines={1}>
                      {hhmm(s)}–{hhmm(e)}
                      {a.room ? ` · ${a.room}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Danh sách tuần (màn hẹp) ─────────────────────────────────────────────────
function WeekList({
  weekDays,
  events,
  onPressEvent,
}: {
  weekDays: Date[];
  events: AppointmentItem[];
  onPressEvent: (a: AppointmentItem) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.listPane}>
      <Text style={styles.listTitle}>
        Tuần {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} –{' '}
        {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1}
      </Text>
      {events.length === 0 ? (
        <Text style={styles.empty}>Chưa có lịch hẹn nào trong tuần này.</Text>
      ) : (
        events.map((a) => {
          const s = new Date(a.starts_at);
          const e = new Date(a.ends_at);
          return (
            <Pressable
              key={a.appointment_id}
              style={styles.listCard}
              onPress={() => onPressEvent(a)}
            >
              <View style={styles.listTimeCol}>
                <Text style={styles.listDay}>
                  {WEEKDAYS[s.getDay()]} {s.getDate()}/{s.getMonth() + 1}
                </Text>
                <Text style={styles.listTime}>
                  {hhmm(s)}–{hhmm(e)}
                </Text>
              </View>
              <View style={styles.listInfoCol}>
                <Text style={styles.eventDoctor}>{a.doctor_name}</Text>
                <Text style={styles.eventMeta}>
                  {a.location}
                  {a.room ? ` · Phòng ${a.room}` : ''}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBtn: {
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  todayBtnText: { color: GREEN, fontWeight: '600', fontSize: 14 },
  arrowBtn: { paddingHorizontal: 6 },
  arrowText: { fontSize: 24, color: '#555', fontWeight: 'bold' },
  rangeLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  error: { color: '#D64545', fontSize: 14, paddingHorizontal: 16, paddingBottom: 6 },

  layout: { flex: 1, flexDirection: 'row' },
  layoutNarrow: { flexDirection: 'column' },

  monthPane: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    padding: 12,
  },
  monthPaneNarrow: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  monthToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  monthToggleIcon: { fontSize: 18, color: GREEN, fontWeight: 'bold' },

  month: { gap: 2 },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  monthTitle: { fontSize: 17, fontWeight: 'bold', color: '#222' },
  monthArrows: { flexDirection: 'row', gap: 18 },
  monthWeekdays: { flexDirection: 'row' },
  monthWeekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#888' },
  monthRow: { flexDirection: 'row' },
  monthCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  monthDayWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthToday: { backgroundColor: GREEN },
  monthSelected: { backgroundColor: '#E7F5E9' },
  monthDay: { fontSize: 14, color: '#333' },
  monthDayDim: { color: '#c2c2c2' },
  monthDayToday: { color: '#fff', fontWeight: 'bold' },
  eventDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: BLOCK_BORDER, marginTop: 1 },
  eventDotHidden: { opacity: 0 },

  weekPane: { flex: 1 },
  weekHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 6,
  },
  weekHeaderCell: { flex: 1, alignItems: 'center', gap: 2 },
  weekHeaderWd: { fontSize: 12, color: '#888', fontWeight: '600' },
  weekHeaderDayWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeaderDay: { fontSize: 15, fontWeight: '600', color: '#333' },

  weekBody: { flexDirection: 'row' },
  hourGutter: { width: 52 },
  hourCell: { height: HOUR_HEIGHT, alignItems: 'flex-end', paddingRight: 6 },
  hourLabel: { fontSize: 11, color: '#999', marginTop: -6 },
  dayCol: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#f0f0f0',
    position: 'relative',
  },
  dayColSelected: { backgroundColor: '#fafdf9' },
  hourSlot: { height: HOUR_HEIGHT, borderBottomWidth: 1, borderBottomColor: '#f3f3f3' },
  eventBlock: {
    position: 'absolute',
    left: 3,
    right: 3,
    backgroundColor: BLOCK_BG,
    borderLeftWidth: 3,
    borderLeftColor: BLOCK_BORDER,
    borderRadius: 6,
    padding: 5,
    overflow: 'hidden',
  },
  eventDoctor: { fontSize: 12, fontWeight: 'bold', color: '#0d3c73' },
  eventMeta: { fontSize: 11, color: '#33557a' },

  listPane: { padding: 16, gap: 10 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  empty: { fontSize: 15, color: '#888', textAlign: 'center', paddingVertical: 24 },
  listCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: BLOCK_BG,
    borderLeftWidth: 4,
    borderLeftColor: BLOCK_BORDER,
    borderRadius: 10,
    padding: 12,
  },
  listTimeCol: { width: 92 },
  listDay: { fontSize: 13, fontWeight: 'bold', color: '#0d3c73' },
  listTime: { fontSize: 13, color: '#33557a' },
  listInfoCol: { flex: 1, gap: 2 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    gap: 10,
  },
  modalDoctor: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  modalLine: { fontSize: 15, color: '#444' },
  modalNote: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  modalClose: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCloseText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
